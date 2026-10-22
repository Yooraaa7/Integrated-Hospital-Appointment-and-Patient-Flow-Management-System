const QMS = (() => {
    "use strict";

    // ============================================
    // CONFIGURATION
    // ============================================

    const STORAGE_KEYS = {
        queues: "qmsQueues",
        counters: "qmsQueueCounters",
        updatedAt: "qmsUpdatedAt"
    };

    const APPOINTMENT_VISIBLE_MINUTES = 15;
    const APPOINTMENT_OVERDUE_MINUTES = 5;

    const DEPARTMENTS = [
        { name: "General Medicine", prefix: "GM" },
        { name: "Cardiology", prefix: "CD" },
        { name: "Orthopaedics", prefix: "OR" },
        { name: "Dermatology", prefix: "DR" },
        { name: "Paediatrics", prefix: "PD" },
        { name: "Ophthalmology", prefix: "OP" }
    ];

    const COUNTERS = [
        "Counter 1",
        "Counter 2",
        "Counter 3",
        "Counter 4"
    ];

    // ============================================
    // DEPARTMENTS
    // ============================================

    function getDepartments() {
        return DEPARTMENTS.slice();
    }

    function getCounters() {
        return COUNTERS.slice();
    }

    function normalizeDepartment(value) {
        if (!value) return null;

        let cleaned;

        try {
            cleaned = decodeURIComponent(String(value))
                .trim()
                .toLowerCase();
        } catch (error) {
            cleaned = String(value)
                .trim()
                .toLowerCase();
        }

        const match = DEPARTMENTS.find(
            department =>
                department.name.toLowerCase() === cleaned
        );

        return match ? match.name : null;
    }

    function getDepartmentByName(name) {
        const normalized = normalizeDepartment(name);

        return DEPARTMENTS.find(
            department => department.name === normalized
        ) || null;
    }

    function getPrefix(department) {
        const item = getDepartmentByName(department);
        return item ? item.prefix : null;
    }

    function getDepartmentFromUrl() {
        const params = new URLSearchParams(
            window.location.search
        );

        return normalizeDepartment(
            params.get("department")
        );
    }

    // ============================================
    // POSTGRESQL QUEUE CACHE
    // ============================================

    // Queue records are loaded by qms-api.js.
    // They must not be saved directly to localStorage.

    function loadQueues() {
        return window.QMS_REMOTE_ROWS || [];
    }

    function saveQueues() {
        throw new Error(
            "Queues must be changed through the server API"
        );
    }

    // ============================================
    // QUEUE HISTORY
    // ============================================

    function addQueueHistory(
        item,
        type,
        timestamp,
        counter = null,
        staffID = null
    ) {
        if (!Array.isArray(item.history)) {
            item.history = [];
        }

        item.history.push({
            type,
            timestamp,
            counter,
            staffID
        });

        return item;
    }

    function getHistoryMessage(type) {
        const messages = {
            ISSUED: "Ticket Issued",
            CALLED: "Queue Called",
            HOLD: "Queue Put on Hold",
            RECALL: "Queue Recalled",
            COMPLETE: "Queue Completed"
        };

        return messages[type] || type;
    }

    // ============================================
    // QUEUE LOOKUP
    // ============================================

    function getQueueByNumber(queueNumber) {
        if (!queueNumber) return null;

        return loadQueues().find(
            queue => queue.queueNumber === queueNumber
        ) || null;
    }

    function getDepartmentQueues(department) {
        const normalizedDepartment =
            normalizeDepartment(department);

        if (!normalizedDepartment) {
            return [];
        }

        return loadQueues().filter(
            queue =>
                queue.department === normalizedDepartment
        );
    }

    // ============================================
    // CURRENTLY SERVING
    // ============================================

    function getCurrentServing(department, counter) {
        return getDepartmentQueues(department)
            .filter(
                queue =>
                    queue.status === "SERVING" &&
                    queue.counter === counter
            )
            .sort(
                (a, b) =>
                    new Date(
                        b.calledTime || b.lastActionTime
                    ) -
                    new Date(
                        a.calledTime || a.lastActionTime
                    )
            )[0] || null;
    }

    // ============================================
    // APPOINTMENT HELPERS
    // ============================================

    /*
     * Supports the frontend type "Appointment"
     * and backend type "APPOINTMENT".
     *
     * The queue number prefix is also recognised
     * for compatibility with older mappings.
     */
    function isAppointment(queue) {
        if (!queue) return false;

        const type = String(
            queue.type || queue.queue_type || ""
        ).trim().toUpperCase();

        return (
            type === "APPOINTMENT" ||
            String(
                queue.queueNumber || queue.queue_number || ""
            ).toUpperCase().startsWith("AP-")
        );
    }

    /*
     * Our PostgreSQL queue table stores the
     * appointment booked time as scheduled_at.
     *
     * qms-api.js should map it to appointmentTime.
     *
     * The fallbacks below support different
     * versions of the API mapping.
     */
    function getAppointmentTime(queue) {
        if (!queue) return null;

        return (
            queue.appointmentTime ||
            queue.scheduled_at ||
            queue.scheduledAt ||
            queue.appointment_scheduled_at ||
            null
        );
    }

    function appointmentMinutesRemaining(queue) {
        if (!isAppointment(queue)) {
            return null;
        }

        const value = getAppointmentTime(queue);

        if (!value) {
            return null;
        }

        const timestamp = new Date(value).getTime();

        if (!Number.isFinite(timestamp)) {
            return null;
        }

        return (timestamp - Date.now()) / 60000;
    }

    /*
     * Appointment state:
     *
     * HIDDEN   = more than 15 minutes early
     * UPCOMING = within 15 minutes, before booked time
     * READY    = booked time reached
     * OVERDUE  = more than 5 minutes after booked time
     *
     * These are display states, not database
     * queue statuses. PostgreSQL remains WAIT
     * until staff calls the ticket.
     */
    function appointmentState(queue) {
        if (!isAppointment(queue)) {
            return "WALK_IN";
        }

        const minutesRemaining =
            appointmentMinutesRemaining(queue);

        if (minutesRemaining === null) {
            return "UNKNOWN";
        }

        if (
            minutesRemaining >
            APPOINTMENT_VISIBLE_MINUTES
        ) {
            return "HIDDEN";
        }

        if (minutesRemaining > 0) {
            return "UPCOMING";
        }

        if (
            minutesRemaining <
            -APPOINTMENT_OVERDUE_MINUTES
        ) {
            return "OVERDUE";
        }

        return "READY";
    }

    /*
     * A walk-in is callable immediately.
     *
     * An appointment is callable only when
     * its scheduled time has arrived.
     */
    function appointmentCallable(queue) {
        if (!queue) return false;

        const state = appointmentState(queue);

        return (
            state === "WALK_IN" ||
            state === "READY" ||
            state === "OVERDUE"
        );
    }

    /*
     * This controls visibility in the
     * active waiting list.
     */
    function appointmentVisible(queue) {
        const state = appointmentState(queue);

        return (
            state !== "HIDDEN" &&
            state !== "UNKNOWN"
        );
    }

    /*
     * Appointment priority:
     *
     * 2 = callable appointment
     * 1 = walk-in
     * 0 = upcoming appointment
     *
     * Upcoming appointments are displayed
     * but are not callable.
     */
    function getQueueRank(queue) {
        if (!isAppointment(queue)) {
            return 1;
        }

        if (appointmentCallable(queue)) {
            return 2;
        }

        return 0;
    }

    // ============================================
    // WAITING QUEUES
    // ============================================

    function getWaitingQueues(
        department,
        serviceType = "ALL"
    ) {
        const selectedType = String(serviceType)
            .trim()
            .toUpperCase();

        return getDepartmentQueues(department)
            .filter(queue => {
                // Only waiting tickets.
                if (queue.status !== "WAIT") {
                    return false;
                }

                // Match the selected service filter.
                if (selectedType !== "ALL") {
                    const queueType = isAppointment(queue)
                        ? "APPOINTMENT"
                        : String(
                            queue.type ||
                            queue.queue_type ||
                            "WALK_IN"
                        ).trim().toUpperCase();

                    if (
                        queueType !== selectedType &&
                        !(
                            selectedType === "WALK_IN" &&
                            queueType === "WALK-IN"
                        )
                    ) {
                        return false;
                    }
                }

                // Appointments more than 15 minutes
                // away stay out of the active list.
                if (
                    isAppointment(queue) &&
                    !appointmentVisible(queue)
                ) {
                    return false;
                }

                return true;
            })
            .sort((a, b) => {
                const rankA = getQueueRank(a);
                const rankB = getQueueRank(b);

                // Callable appointments first.
                if (rankA !== rankB) {
                    return rankB - rankA;
                }

                // Among callable appointments,
                // serve earliest booked time first.
                if (
                    isAppointment(a) &&
                    isAppointment(b)
                ) {
                    const timeA = new Date(
                        getAppointmentTime(a)
                    ).getTime();

                    const timeB = new Date(
                        getAppointmentTime(b)
                    ).getTime();

                    if (timeA !== timeB) {
                        return timeA - timeB;
                    }
                }

                // Otherwise use issued time.
                const issuedA = new Date(
                    a.issuedTime || a.issued_at || 0
                ).getTime();

                const issuedB = new Date(
                    b.issuedTime || b.issued_at || 0
                ).getTime();

                const safeA = Number.isFinite(issuedA)
                    ? issuedA
                    : 0;

                const safeB = Number.isFinite(issuedB)
                    ? issuedB
                    : 0;

                return safeA - safeB;
            });
    }

    // ============================================
    // NEXT CALLABLE QUEUE
    // ============================================

    function getNextWaitingQueue(
        department,
        serviceType = "ALL"
    ) {
        return (
            getWaitingQueues(department, serviceType)
                .find(appointmentCallable) || null
        );
    }

    // ============================================
    // LOCAL MUTATION COMPATIBILITY
    // ============================================

    /*
     * These functions are retained because
     * other frontend files may reference them.
     *
     * Queue writes are performed by the
     * PostgreSQL API bridge in qms-api.js.
     */

    function updateQueue(queueNumber, updater) {
        const queues = loadQueues();

        const index = queues.findIndex(
            queue => queue.queueNumber === queueNumber
        );

        if (index === -1) {
            return null;
        }

        const updated = updater({
            ...queues[index]
        });

        if (!updated) {
            return null;
        }

        queues[index] = updated;

        saveQueues(queues);

        return updated;
    }

    // ============================================
    // CALL QUEUE
    // ============================================

    function callQueue(
        queueNumber,
        department,
        counter,
        staffID
    ) {
        if (!queueNumber) {
            return {
                success: false,
                message: "Please select a queue."
            };
        }

        const current = getCurrentServing(
            department,
            counter
        );

        if (current) {
            return {
                success: false,
                message:
                    `${current.queueNumber} is currently being served. ` +
                    "Complete or hold it before calling another queue."
            };
        }

        const queue = getQueueByNumber(queueNumber);

        if (!queue) {
            return {
                success: false,
                message: "Queue not found."
            };
        }

        if (
            queue.department !==
            normalizeDepartment(department)
        ) {
            return {
                success: false,
                message:
                    "This queue belongs to another department."
            };
        }

        if (
            queue.status !== "WAIT" &&
            queue.status !== "HOLD"
        ) {
            return {
                success: false,
                message:
                    "This queue is no longer available."
            };
        }

        // Prevent calling waiting appointments early.
        // This must also be enforced by the backend.
        if (
            queue.status === "WAIT" &&
            isAppointment(queue) &&
            !appointmentCallable(queue)
        ) {
            return {
                success: false,
                message:
                    "This appointment cannot be called " +
                    "before its scheduled time."
            };
        }

        const now = new Date().toISOString();

        const wasOnHold = queue.status === "HOLD";

        const updated = updateQueue(
            queueNumber,
            item => {
                item.status = "SERVING";

                // Counter assigned when staff calls.
                item.counter = counter;

                item.calledTime = now;
                item.lastActionTime = now;
                item.holdTime = null;
                item.calledBy = staffID || null;

                addQueueHistory(
                    item,
                    wasOnHold ? "RECALL" : "CALLED",
                    now,
                    counter,
                    staffID || null
                );

                return item;
            }
        );

        return {
            success: Boolean(updated),
            queue: updated,
            message: updated
                ? `${queueNumber} is now serving.`
                : "Unable to call queue."
        };
    }

    // ============================================
    // RECALL CURRENT QUEUE
    // ============================================

    function recallCurrent(department, counter) {
        const current = getCurrentServing(
            department,
            counter
        );

        if (!current) {
            return {
                success: false,
                message:
                    "There is no current queue to recall."
            };
        }

        const now = new Date().toISOString();

        const updated = updateQueue(
            current.queueNumber,
            item => {
                item.recallCount =
                    Number(item.recallCount || 0) + 1;

                item.lastActionTime = now;

                addQueueHistory(
                    item,
                    "RECALL",
                    now,
                    item.counter || counter || null,
                    item.calledBy || null
                );

                return item;
            }
        );

        return {
            success: Boolean(updated),
            queue: updated,
            message: updated
                ? `${current.queueNumber} recalled.`
                : "Unable to recall queue."
        };
    }

    // ============================================
    // COMPLETE CURRENT QUEUE
    // ============================================

    function completeCurrent(department, counter) {
        const current = getCurrentServing(
            department,
            counter
        );

        if (!current) {
            return {
                success: false,
                message:
                    "There is no current queue to complete."
            };
        }

        const now = new Date().toISOString();

        const updated = updateQueue(
            current.queueNumber,
            item => {
                item.status = "COMPLETED";
                item.completedTime = now;
                item.lastActionTime = now;

                addQueueHistory(
                    item,
                    "COMPLETE",
                    now,
                    item.counter || counter || null,
                    item.calledBy || null
                );

                return item;
            }
        );

        return {
            success: Boolean(updated),
            queue: updated,
            message: updated
                ? `${current.queueNumber} completed.`
                : "Unable to complete queue."
        };
    }

    // ============================================
    // HOLD CURRENT QUEUE
    // ============================================

    function holdCurrent(department, counter) {
        const current = getCurrentServing(
            department,
            counter
        );

        if (!current) {
            return {
                success: false,
                message:
                    "There is no current queue to hold."
            };
        }

        const now = new Date().toISOString();

        const updated = updateQueue(
            current.queueNumber,
            item => {
                item.status = "HOLD";
                item.holdTime = now;
                item.lastActionTime = now;

                addQueueHistory(
                    item,
                    "HOLD",
                    now,
                    item.counter || counter || null,
                    item.calledBy || null
                );

                return item;
            }
        );

        return {
            success: Boolean(updated),
            queue: updated,
            message: updated
                ? `${current.queueNumber} placed on hold.`
                : "Unable to hold queue."
        };
    }

    // ============================================
    // TIME FORMATTING
    // ============================================

    function formatTime(value) {
        if (!value) return "--";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "--";
        }

        return date.toLocaleTimeString(
            "en-MY",
            {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Kuala_Lumpur"
            }
        );
    }

    function formatDateTime(value) {
        if (!value) return "--";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "--";
        }

        return date.toLocaleString(
            "en-MY",
            {
                dateStyle: "short",
                timeStyle: "short",
                timeZone: "Asia/Kuala_Lumpur"
            }
        );
    }

    function formatRelativeTime(value) {
        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        const difference = Math.max(
            0,
            Date.now() - date.getTime()
        );

        const minutes = Math.floor(
            difference / 60000
        );

        if (minutes < 1) {
            return "Just now";
        }

        if (minutes === 1) {
            return "1 min";
        }

        if (minutes < 60) {
            return `${minutes} min`;
        }

        const hours = Math.floor(minutes / 60);

        if (hours === 1) {
            return "1 hr";
        }

        if (hours < 24) {
            return `${hours} hrs`;
        }

        const days = Math.floor(hours / 24);

        return days === 1
            ? "1 day"
            : `${days} days`;
    }

    function isWithinTimeRange(value, range) {
        if (range === "ALL") {
            return true;
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return false;
        }

        const minutesMap = {
            "30M": 30,
            "1H": 60,
            "3H": 180,
            "24H": 1440
        };

        const minutes = minutesMap[range];

        if (!minutes) {
            return true;
        }

        return (
            Date.now() - date.getTime()
        ) <= minutes * 60000;
    }

    // ============================================
    // LIVE SERVING LIST
    // ============================================

    function getLatestServing(department) {
        return getDepartmentQueues(department)
            .filter(
                queue => queue.status === "SERVING"
            )
            .sort(
                (a, b) =>
                    new Date(
                        b.calledTime || b.lastActionTime
                    ) -
                    new Date(
                        a.calledTime || a.lastActionTime
                    )
            )[0] || null;
    }

    function getActiveServing(department) {
        return getDepartmentQueues(department)
            .filter(
                queue => queue.status === "SERVING"
            )
            .sort(
                (a, b) =>
                    new Date(
                        b.calledTime || b.lastActionTime
                    ) -
                    new Date(
                        a.calledTime || a.lastActionTime
                    )
            );
    }

    function getWaitingCount(
        department,
        serviceType = "ALL"
    ) {
        return getWaitingQueues(
            department,
            serviceType
        ).length;
    }

    // ============================================
    // STAFF SESSION
    // ============================================

    function getSession() {
        return {
            department: normalizeDepartment(
                sessionStorage.getItem("department")
            ),

            counter: sessionStorage.getItem(
                "counter"
            ),

            staffID: sessionStorage.getItem(
                "staffID"
            )
        };
    }

    function clearSession() {
        sessionStorage.removeItem("department");
        sessionStorage.removeItem("counter");
        sessionStorage.removeItem("staffID");
    }

    // ============================================
    // PUBLIC QMS FUNCTIONS
    // ============================================

    return {
        STORAGE_KEYS,

        getDepartments,
        getCounters,
        normalizeDepartment,
        getDepartmentByName,
        getPrefix,
        getDepartmentFromUrl,

        loadQueues,
        getQueueByNumber,
        getDepartmentQueues,

        getCurrentServing,

        // Appointment queue functionality
        isAppointment,
        getAppointmentTime,
        appointmentMinutesRemaining,
        appointmentState,
        appointmentCallable,
        appointmentVisible,

        getWaitingQueues,
        getNextWaitingQueue,

        callQueue,
        recallCurrent,
        completeCurrent,
        holdCurrent,

        formatTime,
        formatDateTime,
        formatRelativeTime,
        isWithinTimeRange,

        addQueueHistory,
        getHistoryMessage,

        getLatestServing,
        getActiveServing,
        getWaitingCount,

        getSession,
        clearSession
    };
})();
