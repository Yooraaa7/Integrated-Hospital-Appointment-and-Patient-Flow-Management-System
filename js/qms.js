const QMS = (() => {

    const STORAGE_KEYS = {
        queues: "qmsQueues",
        counters: "qmsQueueCounters",
        updatedAt: "qmsUpdatedAt"
    };

    const DEPARTMENTS = [
        {
            name: "General Medicine",
            prefix: "GM"
        },
        {
            name: "Cardiology",
            prefix: "CD"
        },
        {
            name: "Orthopaedics",
            prefix: "OR"
        },
        {
            name: "Dermatology",
            prefix: "DR"
        },
        {
            name: "Paediatrics",
            prefix: "PD"
        },
        {
            name: "Ophthalmology",
            prefix: "OP"
        }
    ];

    const COUNTERS = [
        "Counter 1",
        "Counter 2",
        "Counter 3",
        "Counter 4"
    ];

    // Prototype account.
    // Real authentication will move to the backend/database later.
    const STAFF_ACCOUNTS = [
        {
            staffID: "STA101",
            password: "sta101",
            name: "QMS Staff"
        }
    ];

    function getDepartments() {
        return DEPARTMENTS.slice();
    }

    function getCounters() {
        return COUNTERS.slice();
    }

    function normalizeDepartment(value) {

        if (!value) {
            return null;
        }

        const cleaned =
            decodeURIComponent(String(value))
                .trim()
                .toLowerCase();

        const match =
            DEPARTMENTS.find(
                department =>
                    department.name.toLowerCase() === cleaned
            );

        return match ? match.name : null;
    }

    function getDepartmentByName(name) {

        const normalized =
            normalizeDepartment(name);

        return DEPARTMENTS.find(
            department =>
                department.name === normalized
        ) || null;
    }

    function getPrefix(department) {

        const item =
            getDepartmentByName(department);

        return item ? item.prefix : null;
    }

    function getDepartmentFromUrl() {

        const params =
            new URLSearchParams(
                window.location.search
            );

        return normalizeDepartment(
            params.get("department")
        );
    }

    function loadQueues() {

        try {

            const saved =
                localStorage.getItem(
                    STORAGE_KEYS.queues
                );

            const queues =
                saved ? JSON.parse(saved) : [];

            return Array.isArray(queues)
                ? queues
                : [];

        } catch (error) {

            console.error(
                "Unable to load QMS queues.",
                error
            );

            return [];
        }
    }

    function saveQueues(queues) {

        localStorage.setItem(
            STORAGE_KEYS.queues,
            JSON.stringify(queues)
        );

        localStorage.setItem(
            STORAGE_KEYS.updatedAt,
            Date.now().toString()
        );
    }

    function loadQueueCounters() {

        try {

            const saved =
                localStorage.getItem(
                    STORAGE_KEYS.counters
                );

            const counters =
                saved ? JSON.parse(saved) : {};

            return counters &&
                typeof counters === "object"
                ? counters
                : {};

        } catch (error) {

            return {};
        }
    }

    function saveQueueCounters(counters) {

        localStorage.setItem(
            STORAGE_KEYS.counters,
            JSON.stringify(counters)
        );
    }

    function getNextQueueNumber(department) {

        const prefix =
            getPrefix(department);

        if (!prefix) {
            throw new Error(
                "Invalid department."
            );
        }

        const queues =
            loadQueues();

        const counters =
            loadQueueCounters();

        const storedCounter =
            Number(counters[prefix] || 0);

        const existingNumbers =
            queues
                .filter(
                    queue =>
                        queue.department === department &&
                        typeof queue.queueNumber === "string" &&
                        queue.queueNumber.startsWith(prefix)
                )
                .map(
                    queue =>
                        Number(
                            queue.queueNumber
                                .replace(prefix, "")
                        ) || 0
                );

        const largestExisting =
            existingNumbers.length
                ? Math.max(...existingNumbers)
                : 0;

        const nextNumber =
            Math.max(
                storedCounter,
                largestExisting
            ) + 1;

        counters[prefix] =
            nextNumber;

        saveQueueCounters(counters);

        return (
            prefix +
            String(nextNumber).padStart(3, "0")
        );
    }


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
            type: type,
            timestamp: timestamp,
            counter: counter,
            staffID: staffID
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

    function createQueue(
        department,
        type = "Walk-In"
    ) {

        const normalizedDepartment =
            normalizeDepartment(department);

        if (!normalizedDepartment) {
            throw new Error(
                "Invalid department."
            );
        }

        const queueNumber =
            getNextQueueNumber(
                normalizedDepartment
            );

        const now =
            new Date().toISOString();

        const newQueue = {

            id:
                "Q-" +
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .slice(2, 8),

            queueNumber:
                queueNumber,

            department:
                normalizedDepartment,

            type:
                type,

            status:
                "WAIT",

            // Counter is intentionally null.
            // It is assigned only when staff calls the queue.
            counter:
                null,

            issuedTime:
                now,

            calledTime:
                null,

            holdTime:
                null,

            completedTime:
                null,

            lastActionTime:
                now,

            recallCount:
                0,

            calledBy:
                null,

            history: [
                {
                    type: "ISSUED",
                    timestamp: now,
                    counter: null,
                    staffID: null
                }
            ]
        };

        const queues =
            loadQueues();

        queues.push(newQueue);

        saveQueues(queues);

        return newQueue;
    }

    function createWalkInQueue(department) {

        return createQueue(
            department,
            "Walk-In"
        );
    }

    function getQueueByNumber(queueNumber) {

        if (!queueNumber) {
            return null;
        }

        const queues =
            loadQueues();

        return (
            queues.find(
                queue =>
                    queue.queueNumber ===
                    queueNumber
            ) || null
        );
    }

    function getDepartmentQueues(department) {

        const normalizedDepartment =
            normalizeDepartment(department);

        if (!normalizedDepartment) {
            return [];
        }

        return loadQueues().filter(
            queue =>
                queue.department ===
                normalizedDepartment
        );
    }

    function getCurrentServing(
        department,
        counter
    ) {

        return (
            getDepartmentQueues(department)
                .filter(
                    queue =>
                        queue.status === "SERVING" &&
                        queue.counter === counter
                )
                .sort(
                    (a, b) =>
                        new Date(b.calledTime || b.lastActionTime) -
                        new Date(a.calledTime || a.lastActionTime)
                )[0] || null
        );
    }

    function getWaitingQueues(
        department,
        serviceType = "ALL"
    ) {

        return getDepartmentQueues(department)
            .filter(queue => {

                if (queue.status !== "WAIT") {
                    return false;
                }

                if (
                    serviceType !== "ALL" &&
                    queue.type !== serviceType
                ) {
                    return false;
                }

                return true;
            })
            .sort(
                (a, b) =>
                    new Date(a.issuedTime) -
                    new Date(b.issuedTime)
            );
    }

    function getNextWaitingQueue(
        department,
        serviceType = "ALL"
    ) {

        return (
            getWaitingQueues(
                department,
                serviceType
            )[0] || null
        );
    }

    function updateQueue(
        queueNumber,
        updater
    ) {

        const queues =
            loadQueues();

        const index =
            queues.findIndex(
                queue =>
                    queue.queueNumber ===
                    queueNumber
            );

        if (index === -1) {
            return null;
        }

        const updated =
            updater({
                ...queues[index]
            });

        if (!updated) {
            return null;
        }

        queues[index] =
            updated;

        saveQueues(queues);

        return updated;
    }

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

        const current =
            getCurrentServing(
                department,
                counter
            );

        if (current) {
            return {
                success: false,
                message:
                    `${current.queueNumber} is currently being served. ` +
                    `Complete or hold it before calling another queue.`
            };
        }

        const queue =
            getQueueByNumber(queueNumber);

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

        const now =
            new Date().toISOString();

        // A queue selected from HOLD is being recalled,
        // not called for the first time.
        const wasOnHold =
            queue.status === "HOLD";

        const updated =
            updateQueue(
                queueNumber,
                item => {

                    item.status =
                        "SERVING";

                    // Counter is assigned here,
                    // not when the ticket is issued.
                    item.counter =
                        counter;

                    item.calledTime =
                        now;

                    item.lastActionTime =
                        now;

                    item.holdTime =
                        null;

                    item.calledBy =
                        staffID || null;

                    addQueueHistory(
                        item,
                        wasOnHold
                            ? "RECALL"
                            : "CALLED",
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
            message:
                updated
                    ? `${queueNumber} is now serving.`
                    : "Unable to call queue."
        };
    }

    function recallCurrent(
        department,
        counter
    ) {

        const current =
            getCurrentServing(
                department,
                counter
            );

        if (!current) {
            return {
                success: false,
                message: "There is no current queue to recall."
            };
        }

        const now =
            new Date().toISOString();

        const updated =
            updateQueue(
                current.queueNumber,
                item => {

                    item.recallCount =
                        Number(item.recallCount || 0) + 1;

                    item.lastActionTime =
                        now;

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
            message:
                updated
                    ? `${current.queueNumber} recalled.`
                    : "Unable to recall queue."
        };
    }

    function completeCurrent(
        department,
        counter
    ) {

        const current =
            getCurrentServing(
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

        const now =
            new Date().toISOString();

        const updated =
            updateQueue(
                current.queueNumber,
                item => {

                    item.status =
                        "COMPLETED";

                    item.completedTime =
                        now;

                    item.lastActionTime =
                        now;

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
            message:
                updated
                    ? `${current.queueNumber} completed.`
                    : "Unable to complete queue."
        };
    }

    function holdCurrent(
        department,
        counter
    ) {

        const current =
            getCurrentServing(
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

        const now =
            new Date().toISOString();

        const updated =
            updateQueue(
                current.queueNumber,
                item => {

                    item.status =
                        "HOLD";

                    item.holdTime =
                        now;

                    item.lastActionTime =
                        now;

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
            message:
                updated
                    ? `${current.queueNumber} placed on hold.`
                    : "Unable to hold queue."
        };
    }

    function formatTime(value) {

        if (!value) {
            return "--";
        }

        const date =
            new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "--";
        }

        return date.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }

    function formatDateTime(value) {

        if (!value) {
            return "--";
        }

        const date =
            new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "--";
        }

        return date.toLocaleString(
            [],
            {
                dateStyle: "short",
                timeStyle: "short"
            }
        );
    }

    function formatRelativeTime(value) {

        if (!value) {
            return "";
        }

        const date =
            new Date(value);

        const difference =
            Math.max(
                0,
                Date.now() - date.getTime()
            );

        const minutes =
            Math.floor(
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

        const hours =
            Math.floor(minutes / 60);

        if (hours === 1) {
            return "1 hr";
        }

        if (hours < 24) {
            return `${hours} hrs`;
        }

        const days =
            Math.floor(hours / 24);

        return days === 1
            ? "1 day"
            : `${days} days`;
    }

    function isWithinTimeRange(
        value,
        range
    ) {

        if (range === "ALL") {
            return true;
        }

        const date =
            new Date(value);

        if (Number.isNaN(date.getTime())) {
            return false;
        }

        const minutesMap = {
            "30M": 30,
            "1H": 60,
            "3H": 180,
            "24H": 1440
        };

        const minutes =
            minutesMap[range];

        if (!minutes) {
            return true;
        }

        return (
            Date.now() -
            date.getTime()
        ) <= minutes * 60000;
    }

    function getLatestServing(
        department
    ) {

        return (
            getDepartmentQueues(department)
                .filter(
                    queue =>
                        queue.status === "SERVING"
                )
                .sort(
                    (a, b) =>
                        new Date(
                            b.calledTime ||
                            b.lastActionTime
                        ) -
                        new Date(
                            a.calledTime ||
                            a.lastActionTime
                        )
                )[0] || null
        );
    }

    function getActiveServing(
        department
    ) {

        return getDepartmentQueues(department)
            .filter(
                queue =>
                    queue.status === "SERVING"
            )
            .sort(
                (a, b) =>
                    new Date(
                        b.calledTime ||
                        b.lastActionTime
                    ) -
                    new Date(
                        a.calledTime ||
                        a.lastActionTime
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

    function validateStaffLogin(
        staffID,
        password
    ) {

        const normalizedID =
            String(staffID || "")
                .trim()
                .toUpperCase();

        return (
            STAFF_ACCOUNTS.find(
                account =>
                    account.staffID === normalizedID &&
                    account.password === password
            ) || null
        );
    }

    function getSession() {

        return {
            department:
                normalizeDepartment(
                    sessionStorage.getItem(
                        "department"
                    )
                ),

            counter:
                sessionStorage.getItem(
                    "counter"
                ),

            staffID:
                sessionStorage.getItem(
                    "staffID"
                )
        };
    }

    function clearSession() {

        sessionStorage.removeItem(
            "department"
        );

        sessionStorage.removeItem(
            "counter"
        );

        sessionStorage.removeItem(
            "staffID"
        );
    }

    return {

        STORAGE_KEYS,

        getDepartments,
        getCounters,
        normalizeDepartment,
        getDepartmentByName,
        getPrefix,
        getDepartmentFromUrl,

        loadQueues,
        saveQueues,

        createQueue,
        createWalkInQueue,
        getQueueByNumber,
        getDepartmentQueues,

        getCurrentServing,
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

        validateStaffLogin,
        getSession,
        clearSession
    };
})();