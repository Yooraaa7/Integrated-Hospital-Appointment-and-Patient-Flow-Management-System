const session = QMS.getSession();

if (
    !session.department ||
    !session.counter ||
    !session.staffID
) {
    window.location.href = "login.html";

} else {
    "use strict";

    // =============================================
    // ELEMENTS
    // =============================================

    const $ = id => document.getElementById(id);

    const dashboardDepartment = $("dashboardDepartment");
    const dashboardCounter = $("dashboardCounter");
    const dashboardStaffID = $("dashboardStaffID");

    const currentNumber = $("currentNumber");
    const currentType = $("currentType");
    const servingStatus = $("servingStatus");

    const recallButton = $("recallButton");
    const completeButton = $("completeButton");
    const holdButton = $("holdButton");

    const dashboardMessage = $("dashboardMessage");

    const waitTab = $("waitTab");
    const holdTab = $("holdTab");
    const waitCount = $("waitCount");
    const holdCount = $("holdCount");

    const serviceFilter = $("serviceFilter");
    const searchInput = $("searchInput");
    const searchButton = $("searchButton");
    const queueList = $("queueList");

    const queueTimelineView = $("queueTimelineView");
    const queueTimeline = $("queueTimeline");
    const timelineQueueNumber = $("timelineQueueNumber");
    const closeTimelineButton = $("closeTimelineButton");

    const logoutButton = $("logoutButton");

    // =============================================
    // STATE
    // =============================================

    let activeTab = "WAIT";
    let searchText = "";
    let actionInProgress = false;
    let currentTimelineNumber = null;

    dashboardDepartment.textContent = session.department;
    dashboardCounter.textContent = session.counter;
    dashboardStaffID.textContent = session.staffID;

    // =============================================
    // HELPERS
    // =============================================

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = String(text);
        }

        return element;
    }

    function showMessage(message, type = "info") {
        dashboardMessage.textContent = message;
        dashboardMessage.className =
            "dashboard-message " + type;

        clearTimeout(showMessage.timer);

        showMessage.timer = setTimeout(() => {
            dashboardMessage.textContent = "";
            dashboardMessage.className = "dashboard-message";
        }, 3500);
    }

    function isAppointment(queue) {
        return QMS.isAppointment(queue);
    }

    function getAppointmentState(queue) {
        return QMS.appointmentState(queue);
    }

    function isCallable(queue) {
        if (queue.status === "HOLD") {
            return true;
        }

        return QMS.appointmentCallable(queue);
    }

    function getBookedTime(queue) {
        return QMS.getAppointmentTime(queue);
    }

    function formatBookedTime(queue) {
        const value = getBookedTime(queue);

        if (!value) return "Unknown time";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Unknown time";
        }

        return date.toLocaleTimeString("en-MY", {
            timeZone: "Asia/Kuala_Lumpur",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
    }

    function matchesService(queue) {
        const selected = String(
            serviceFilter.value || "ALL"
        ).toUpperCase();

        if (selected === "ALL") {
            return true;
        }

        const queueType = isAppointment(queue)
            ? "APPOINTMENT"
            : "WALK_IN";

        const normalized = selected.replace("-", "_");

        return queueType === normalized;
    }

    function matchesFilters(queue) {
        if (!matchesService(queue)) {
            return false;
        }

        if (
            searchText &&
            String(queue.queueNumber).toUpperCase() !== searchText
        ) {
            return false;
        }

        return true;
    }

    // =============================================
    // QUEUE DATA FOR EACH TAB
    // =============================================

    function getVisibleWaitingQueues() {
        // Use the appointment-aware sorting and
        // 15-minute filtering from qms.js.
        return QMS.getWaitingQueues(
            session.department,
            serviceFilter.value
        ).filter(matchesFilters);
    }

    function getHeldQueues() {
        return QMS.getDepartmentQueues(session.department)
            .filter(queue => queue.status === "HOLD")
            .filter(matchesFilters)
            .sort((a, b) => {
                return new Date(a.holdTime || a.issuedTime) -
                    new Date(b.holdTime || b.issuedTime);
            });
    }

    // =============================================
    // CURRENTLY SERVING
    // =============================================

    function renderCurrent() {
        const current = QMS.getCurrentServing(
            session.department,
            session.counter
        );

        if (!current) {
            currentNumber.textContent = "—";
            currentType.textContent =
                "No queue is currently being served.";

            servingStatus.innerHTML =
                '<span class="status-dot idle"></span>' +
                '<i class="bi bi-check-circle"></i>' +
                'Ready for next patient';

            recallButton.disabled = true;
            completeButton.disabled = true;
            holdButton.disabled = true;
            return;
        }

        currentNumber.textContent = current.queueNumber;

        currentType.textContent =
            `${current.type} • Called at ` +
            QMS.formatTime(current.calledTime);

        servingStatus.innerHTML =
            '<span class="status-dot"></span>' +
            '<i class="bi bi-person-check"></i>' +
            'Serving Now';

        recallButton.disabled = actionInProgress;
        completeButton.disabled = actionInProgress;
        holdButton.disabled = actionInProgress;
    }

    // =============================================
    // COUNTS
    // =============================================

    function renderCounts() {
        const waiting = QMS.getWaitingQueues(
            session.department,
            serviceFilter.value
        );

        const held = QMS.getDepartmentQueues(
            session.department
        ).filter(queue => {
            return queue.status === "HOLD" &&
                matchesService(queue);
        });

        // Hidden future appointments are not counted
        // as actively waiting.
        waitCount.textContent = waiting.length;
        holdCount.textContent = held.length;
    }

    // =============================================
    // APPOINTMENT VISUAL INDICATOR
    // =============================================
    
    
    function addAppointmentIndicator(item, queue) {
        if (
            !isAppointment(queue) ||
            queue.status !== "WAIT"
        ) {
            return;
        }

        const state = getAppointmentState(queue);

        const indicator = createElement(
            "span",
            "appointment-indicator"
        );

        if (state === "UPCOMING") {
            item.classList.add("appointment-upcoming");
            indicator.textContent = "UPCOMING";

        } else if (state === "READY") {
            item.classList.add("appointment-ready");
            indicator.textContent = "READY TO CALL";

        } else if (state === "OVERDUE") {
            item.classList.add("appointment-overdue");
            indicator.textContent = "OVERDUE";

        } else {
            return;
        }

        // Place the status on the RIGHT side.
        const side = item.querySelector(".queue-side");

        if (side) {
            side.appendChild(indicator);
        }
    }


    // =============================================
    // SAFE QUEUE ACTIONS
    // =============================================

    async function runAction(action) {
        if (actionInProgress) {
            return null;
        }

        actionInProgress = true;

        try {
            const result = await action();

            if (result && result.message) {
                showMessage(
                    result.message,
                    result.success ? "success" : "error"
                );
            }

            return result;

        } catch (error) {
            console.error("QMS action failed:", error);

            showMessage(
                error.message || "Unable to perform this action.",
                "error"
            );

            return {
                success: false,
                message: error.message
            };

        } finally {
            actionInProgress = false;
            render();
        }
    }

    async function callSelectedQueue(queue) {
        if (actionInProgress) {
            return;
        }

        // Upcoming appointments cannot be called.
        if (
            queue.status === "WAIT" &&
            isAppointment(queue) &&
            !QMS.appointmentCallable(queue)
        ) {
            showMessage(
                `Appointment ${queue.queueNumber} ` +
                `can only be called at ${formatBookedTime(queue)}.`,
                "info"
            );
            return;
        }

        const current = QMS.getCurrentServing(
            session.department,
            session.counter
        );

        if (current) {
            showMessage(
                `${current.queueNumber} is still being served. ` +
                "Complete or hold it first.",
                "error"
            );
            return;
        }

        await runAction(() => QMS.callQueue(
            queue.queueNumber,
            session.department,
            session.counter,
            session.staffID
        ));
    }

    // =============================================
    // RENDER WAITING / HOLD QUEUE CARDS
    // =============================================

    function createQueueCard(queue) {
        const item = createElement(
            "article",
            "queue-item"
        );

        const canCall = isCallable(queue);

        item.tabIndex = canCall ? 0 : -1;

        const main = createElement(
            "div",
            "queue-main"
        );

        const number = createElement(
            "h3",
            "",
            queue.queueNumber
        );

        const displayTime = isAppointment(queue)
            ? getBookedTime(queue)
            : queue.issuedTime;

        const details = createElement(
            "p",
            "",
            `${queue.type} • ` +
            QMS.formatTime(displayTime)
        );


        // Waiting queues must not display an
        // assigned counter before staff calls them.
        const counterText = queue.status === "HOLD"
            ? (
                queue.counter
                    ? `Previously at ${queue.counter}`
                    : "Queue on hold"
            )
            : "Counter assigned when called";

        const counter = createElement(
            "small",
            "",
            counterText
        );

        main.appendChild(number);
        main.appendChild(details);
        main.appendChild(counter);

        const side = createElement(
            "div",
            "queue-side"
        );

        const age = createElement(
            "span",
            "queue-age",
            isAppointment(queue)
                ? ""
                : QMS.formatRelativeTime(
                    queue.lastActionTime ||
                    queue.issuedTime
                )
        );

        const button = createElement(
            "button",
            "queue-call-button"
        );

        button.type = "button";

        if (queue.status === "HOLD") {
            button.textContent = "↻ Recall";

        } else if (!canCall) {
            button.textContent = "";
            button.disabled = true;
            button.hidden = true;

            item.classList.add("queue-not-callable");

        } else {
            button.textContent = "Call";
        }

        if (actionInProgress) {
            button.disabled = true;
        }

        if (!isAppointment(queue)) {
            side.appendChild(age);
            side.appendChild(button);
        }

        item.appendChild(main);
        item.appendChild(side);

        // Add yellow, green or red appointment label.
        addAppointmentIndicator(item, queue);

        if (canCall) {
            button.addEventListener("click", event => {
                event.stopPropagation();
                callSelectedQueue(queue);
            });

            item.addEventListener("click", event => {
                if (event.target === button) {
                    return;
                }

                callSelectedQueue(queue);
            });

            item.addEventListener("keydown", event => {
                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    callSelectedQueue(queue);
                }
            });
        }

        return item;
    }

    function renderList() {
        const filtered = activeTab === "WAIT"
            ? getVisibleWaitingQueues()
            : getHeldQueues();

        queueList.replaceChildren();

        if (filtered.length === 0) {
            const empty = createElement(
                "div",
                "queue-empty"
            );

            const icon = createElement(
                "i",
                activeTab === "WAIT"
                    ? "bi bi-check2-circle"
                    : "bi bi-pause-circle"
            );

            const message = createElement(
                "p",
                "",
                activeTab === "WAIT"
                    ? "No patients are currently waiting."
                    : "No queues are currently on hold."
            );

            empty.appendChild(icon);
            empty.appendChild(message);
            queueList.appendChild(empty);
            return;
        }

        filtered.forEach(queue => {
            queueList.appendChild(
                createQueueCard(queue)
            );
        });
    }

    // =============================================
    // FULL RENDER
    // =============================================

    function render() {
        renderCurrent();
        renderCounts();
        renderList();
    }

    // =============================================
    // CALL NEXT
    // =============================================

    async function callNext() {
        if (actionInProgress) return;

        const current = QMS.getCurrentServing(
            session.department,
            session.counter
        );

        if (current) {
            showMessage(
                `${current.queueNumber} is still being served.`,
                "error"
            );
            return;
        }

        const next = QMS.getNextWaitingQueue(
            session.department,
            serviceFilter.value
        );

        if (!next) {
            showMessage(
                "There are no eligible waiting queues " +
                "for the selected service.",
                "info"
            );
            return;
        }

        await callSelectedQueue(next);
    }

    // =============================================
    // COMPLETE & NEXT / HOLD & NEXT
    // =============================================

    async function finishAndCallNext(operation) {
        if (actionInProgress) return;

        const current = QMS.getCurrentServing(
            session.department,
            session.counter
        );

        if (!current) {
            showMessage(
                "No queue is currently being served.",
                "info"
            );
            return;
        }

        // Block a second action while the first
        // backend request is being processed.
        actionInProgress = true;

        try {
            const finished = operation === "COMPLETE"
                ? await QMS.completeCurrent(
                    session.department,
                    session.counter
                )
                : await QMS.holdCurrent(
                    session.department,
                    session.counter
                );

            if (!finished.success) {
                showMessage(
                    finished.message,
                    "error"
                );
                return;
            }

            const finishedNumber =
                finished.queue?.queueNumber ||
                current.queueNumber;

            const next = QMS.getNextWaitingQueue(
                session.department,
                serviceFilter.value
            );

            if (!next) {
                showMessage(
                    `${finishedNumber} ${
                        operation === "COMPLETE"
                            ? "completed"
                            : "placed on hold"
                    }. No eligible waiting queues.`,
                    "success"
                );
                return;
            }

            const called = await QMS.callQueue(
                next.queueNumber,
                session.department,
                session.counter,
                session.staffID
            );

            if (called.success) {
                showMessage(
                    `${finishedNumber} ${
                        operation === "COMPLETE"
                            ? "completed"
                            : "placed on hold"
                    }. ${next.queueNumber} is now serving.`,
                    "success"
                );
            } else {
                showMessage(
                    `${finishedNumber} updated, but the next ` +
                    `ticket was not called: ${called.message}`,
                    "error"
                );
            }

        } catch (error) {
            console.error("Finish and next failed:", error);

            showMessage(
                error.message || "Unable to update queue.",
                "error"
            );

        } finally {
            actionInProgress = false;
            render();
        }
    }

    // =============================================
    // CURRENT QUEUE ACTION BUTTONS
    // =============================================

    recallButton.addEventListener("click", () => {
        runAction(() => QMS.recallCurrent(
            session.department,
            session.counter
        ));
    });

    completeButton.addEventListener("click", () => {
        finishAndCallNext("COMPLETE");
    });

    holdButton.addEventListener("click", () => {
        finishAndCallNext("HOLD");
    });

    // =============================================
    // WAIT / HOLD TABS
    // =============================================

    waitTab.addEventListener("click", () => {
        activeTab = "WAIT";

        waitTab.classList.add("active");
        holdTab.classList.remove("active");

        renderList();
    });

    holdTab.addEventListener("click", () => {
        activeTab = "HOLD";

        holdTab.classList.add("active");
        waitTab.classList.remove("active");

        renderList();
    });

    // =============================================
    // SERVICE FILTER
    // =============================================

    serviceFilter.addEventListener("change", render);

    // =============================================
    // QUEUE HISTORY
    // =============================================

    function getTimelineHistory(queue) {
        // Prefer actual history from PostgreSQL.
        if (
            Array.isArray(queue.history) &&
            queue.history.length
        ) {
            return queue.history
                .slice()
                .sort((a, b) =>
                    new Date(b.timestamp) -
                    new Date(a.timestamp)
                );
        }

        // Fallback for older records without history.
        const fallback = [];

        const addEvent = (type, time, counter, staffID) => {
            if (time) {
                fallback.push({
                    type,
                    timestamp: time,
                    counter: counter || null,
                    staffID: staffID || null
                });
            }
        };

        addEvent(
            "ISSUED",
            queue.issuedTime,
            null,
            null
        );

        addEvent(
            "CALLED",
            queue.calledTime,
            queue.counter,
            queue.calledBy
        );

        addEvent(
            "HOLD",
            queue.holdTime,
            queue.counter,
            queue.calledBy
        );

        addEvent(
            "COMPLETE",
            queue.completedTime,
            queue.counter,
            queue.calledBy
        );

        return fallback.sort((a, b) =>
            new Date(b.timestamp) -
            new Date(a.timestamp)
        );
    }

    function formatTimelineTime(value) {
        if (!value) return "--:--:--";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "--:--:--";
        }

        return date.toLocaleTimeString("en-MY", {
            timeZone: "Asia/Kuala_Lumpur",
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    }

    function renderTimeline(queue) {
        const mainView = $("dashboardMainView");
        const timelineView = $("queueTimelineView");

        if (!mainView || !timelineView) return;

        if (!queue) {
            currentTimelineNumber = null;
            mainView.style.display = "";
            timelineView.style.display = "none";

            queueTimeline.replaceChildren();
            timelineQueueNumber.textContent = "";
            return;
        }

        currentTimelineNumber = queue.queueNumber;

        mainView.style.display = "none";
        timelineView.style.display = "";

        timelineQueueNumber.textContent =
            `${queue.queueNumber} • ` +
            `${queue.department} • ${queue.type}`;

        queueTimeline.replaceChildren();

        const history = getTimelineHistory(queue);

        if (!history.length) {
            queueTimeline.appendChild(
                createElement(
                    "div",
                    "timeline-empty",
                    "No queue history is available."
                )
            );
            return;
        }

        history.forEach(event => {
            const item = createElement(
                "div",
                "timeline-item timeline-" +
                String(event.type || "").toLowerCase()
            );

            const time = createElement(
                "time",
                "timeline-time",
                formatTimelineTime(event.timestamp)
            );

            time.dateTime = event.timestamp || "";

            const marker = createElement(
                "div",
                "timeline-marker"
            );

            marker.appendChild(
                createElement("span")
            );

            const content = createElement(
                "div",
                "timeline-content"
            );

            content.appendChild(
                createElement(
                    "p",
                    "timeline-message",
                    QMS.getHistoryMessage(event.type)
                )
            );

            if (event.counter || event.staffID) {
                const details = [
                    event.counter,
                    event.staffID
                ].filter(Boolean).join(" • ");

                content.appendChild(
                    createElement(
                        "span",
                        "timeline-meta",
                        details
                    )
                );
            }

            item.appendChild(time);
            item.appendChild(marker);
            item.appendChild(content);

            queueTimeline.appendChild(item);
        });
    }

    function searchQueueHistory() {
        const value = searchInput.value
            .trim()
            .toUpperCase();

        searchText = value;

        if (!value) {
            renderTimeline(null);
            renderList();
            return;
        }

        const queue = QMS.getDepartmentQueues(
            session.department
        ).find(item =>
            String(item.queueNumber).toUpperCase() === value
        );

        if (!queue) {
            renderTimeline(null);

            showMessage(
                `Queue ${value} was not found in ` +
                `${session.department}.`,
                "error"
            );

            renderList();
            return;
        }

        renderTimeline(queue);
        renderList();
    }

    searchButton.addEventListener(
        "click",
        searchQueueHistory
    );

    searchInput.addEventListener(
        "keydown",
        event => {
            if (event.key === "Enter") {
                searchQueueHistory();
            }
        }
    );

    closeTimelineButton.addEventListener(
        "click",
        () => renderTimeline(null)
    );

    // =============================================
    // LOGOUT
    // =============================================

    logoutButton.addEventListener("click", () => {
        QMS.clearSession();
        window.location.href = "login.html";
    });

    // =============================================
    // OTHER TAB UPDATES
    // =============================================

    window.addEventListener("storage", event => {
        if (
            event.key === QMS.STORAGE_KEYS.queues ||
            event.key === QMS.STORAGE_KEYS.updatedAt
        ) {
            render();

            if (currentTimelineNumber) {
                const updatedQueue =
                    QMS.getDepartmentQueues(
                        session.department
                    ).find(queue =>
                        queue.queueNumber ===
                        currentTimelineNumber
                    );

                if (updatedQueue) {
                    renderTimeline(updatedQueue);
                }
            }
        }
    });

    // =============================================
    // REFRESH APPOINTMENT TIME STATUS
    // =============================================

    // Re-render every second to update appointment
    // countdowns and visibility automatically.
    // The PostgreSQL data itself is refreshed by
    // the existing qms-api.js bridge.
    setInterval(() => {
        if (!actionInProgress) {
            render();
        }
    }, 1000);

    // Initial render
    render();
}
