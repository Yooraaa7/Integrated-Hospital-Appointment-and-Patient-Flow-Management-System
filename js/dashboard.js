const session =
    QMS.getSession();


// ------------------------------------------------------------
// Authentication guard
// ------------------------------------------------------------

if (
    !session.department ||
    !session.counter ||
    !session.staffID
) {

    window.location.href =
        "login.html";

} else {

    // --------------------------------------------------------
    // Page elements
    // --------------------------------------------------------

    const dashboardDepartment =
        document.getElementById(
            "dashboardDepartment"
        );

    const dashboardCounter =
        document.getElementById(
            "dashboardCounter"
        );

    const dashboardStaffID =
        document.getElementById(
            "dashboardStaffID"
        );

    const currentNumber =
        document.getElementById(
            "currentNumber"
        );

    const currentType =
        document.getElementById(
            "currentType"
        );

    const servingStatus =
        document.getElementById(
            "servingStatus"
        );

    const recallButton =
        document.getElementById(
            "recallButton"
        );

    const completeButton =
        document.getElementById(
            "completeButton"
        );

    const holdButton =
        document.getElementById(
            "holdButton"
        );

    const dashboardMessage =
        document.getElementById(
            "dashboardMessage"
        );

    const waitTab =
        document.getElementById(
            "waitTab"
        );

    const holdTab =
        document.getElementById(
            "holdTab"
        );

    const waitCount =
        document.getElementById(
            "waitCount"
        );

    const holdCount =
        document.getElementById(
            "holdCount"
        );

    const serviceFilter =
        document.getElementById(
            "serviceFilter"
        );

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    const searchButton =
        document.getElementById(
            "searchButton"
        );

    const queueList =
        document.getElementById(
            "queueList"
        );

    const queueTimelineView =
        document.getElementById(
            "queueTimelineView"
        );

    const queueTimeline =
        document.getElementById(
            "queueTimeline"
        );

    const timelineQueueNumber =
        document.getElementById(
            "timelineQueueNumber"
        );

    const closeTimelineButton =
        document.getElementById(
            "closeTimelineButton"
        );

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    // --------------------------------------------------------
    // Dashboard state
    // --------------------------------------------------------

    let activeTab =
        "WAIT";

    let searchText =
        "";


    // --------------------------------------------------------
    // Header information
    // --------------------------------------------------------

    dashboardDepartment.textContent =
        session.department;

    dashboardCounter.textContent =
        session.counter;

    dashboardStaffID.textContent =
        session.staffID;


    // --------------------------------------------------------
    // Message helper
    // --------------------------------------------------------

    function showMessage(
        message,
        type = "info"
    ) {

        dashboardMessage.textContent =
            message;

        dashboardMessage.className =
            "dashboard-message " +
            type;

        clearTimeout(
            showMessage.timer
        );

        showMessage.timer =
            setTimeout(
                function () {

                    dashboardMessage.textContent =
                        "";

                    dashboardMessage.className =
                        "dashboard-message";

                },
                3500
            );
    }


    // --------------------------------------------------------
    // Queue list filters
    // --------------------------------------------------------

    function matchesFilters(queue) {

        const service =
            serviceFilter.value;

        const search =
            searchText.toUpperCase();


        if (
            service !== "ALL" &&
            queue.type !== service
        ) {
            return false;
        }


        // Queue history search is for one specific queue number.
        if (
            search &&
            String(queue.queueNumber).toUpperCase() !== search
        ) {
            return false;
        }

        return true;
    }


    // --------------------------------------------------------
    // Render current queue
    // --------------------------------------------------------

    function renderCurrent() {

        const current =
            QMS.getCurrentServing(
                session.department,
                session.counter
            );

        if (!current) {

            currentNumber.textContent =
                "—";

            currentType.textContent =
                "No queue is currently being served.";

            servingStatus.innerHTML =
                '<span class="status-dot idle"></span>' +
                '<i class="bi bi-check-circle"></i>' +
                'Ready for next patient';

            recallButton.disabled =
                true;

            completeButton.disabled =
                true;

            holdButton.disabled =
                true;

            return;
        }


        currentNumber.textContent =
            current.queueNumber;

        currentType.textContent =
            `${current.type} • Called at ${QMS.formatTime(current.calledTime)}`;

        servingStatus.innerHTML =
            '<span class="status-dot"></span>' +
            '<i class="bi bi-person-check"></i>' +
            'Serving Now';


        recallButton.disabled =
            false;

        completeButton.disabled =
            false;

        holdButton.disabled =
            false;
    }


    // --------------------------------------------------------
    // Render queue counts
    // --------------------------------------------------------

    function renderCounts() {

        const departmentQueues =
            QMS.getDepartmentQueues(
                session.department
            );

        const service =
            serviceFilter.value;

        const wait =
            departmentQueues.filter(
                queue =>
                    queue.status === "WAIT" &&
                    (
                        service === "ALL" ||
                        queue.type === service
                    )
            ).length;

        const hold =
            departmentQueues.filter(
                queue =>
                    queue.status === "HOLD" &&
                    (
                        service === "ALL" ||
                        queue.type === service
                    )
            ).length;

        waitCount.textContent =
            wait;

        holdCount.textContent =
            hold;
    }


    // --------------------------------------------------------
    // Render queue list
    // --------------------------------------------------------

    function renderList() {

        const departmentQueues =
            QMS.getDepartmentQueues(
                session.department
            );

        const filtered =
            departmentQueues
                .filter(
                    queue =>
                        queue.status === activeTab
                )
                .filter(
                    matchesFilters
                )
                .sort(
                    (a, b) =>
                        new Date(a.issuedTime) -
                        new Date(b.issuedTime)
                );

        queueList.innerHTML =
            "";


        if (!filtered.length) {

            const empty =
                document.createElement(
                    "div"
                );

            empty.className =
                "queue-empty";

            empty.innerHTML =
                activeTab === "WAIT"
                    ? '<i class="bi bi-check2-circle"></i>' +
                      '<p>No patients are waiting.</p>'
                    : '<i class="bi bi-pause-circle"></i>' +
                      '<p>No queues are currently on hold.</p>';

            queueList.appendChild(
                empty
            );

            return;
        }


        filtered.forEach(
            queue => {

                const item =
                    document.createElement(
                        "article"
                    );

                item.className =
                    "queue-item";

                item.tabIndex =
                    0;

                const actionText =
                    activeTab === "HOLD"
                        ? "Recall"
                        : "Call";

                const counterText =
                    queue.counter
                        ? `Held by ${queue.counter}`
                        : "Waiting for counter";


                item.innerHTML = `
                    <div class="queue-main">
                        <h3>${queue.queueNumber}</h3>

                        <p>
                            ${queue.type}
                            <span>•</span>
                            ${QMS.formatTime(queue.issuedTime)}
                        </p>

                        <small>
                            ${counterText}
                        </small>
                    </div>

                    <div class="queue-side">
                        <span class="queue-age">
                            ${QMS.formatRelativeTime(queue.lastActionTime || queue.issuedTime)}
                        </span>

                        <button
                            type="button"
                            class="queue-call-button"
                        >
                            <i class="bi ${
                                activeTab === "HOLD"
                                    ? "bi-arrow-repeat"
                                    : "bi-megaphone"
                            }"></i>
                            ${actionText}
                        </button>
                    </div>
                `;


                const call =
                    async function () {

                        const result =
                            await QMS.callQueue(
                                queue.queueNumber,
                                session.department,
                                session.counter,
                                session.staffID
                            );

                        showMessage(
                            result.message,
                            result.success
                                ? "success"
                                : "error"
                        );

                        render();
                    };


                item
                    .querySelector(
                        ".queue-call-button"
                    )
                    .addEventListener(
                        "click",
                        function (event) {

                            event.stopPropagation();

                            call();
                        }
                    );


                item.addEventListener(
                    "click",
                    call
                );

                item.addEventListener(
                    "keydown",
                    function (event) {

                        if (
                            event.key === "Enter" ||
                            event.key === " "
                        ) {

                            event.preventDefault();

                            call();
                        }
                    }
                );


                queueList.appendChild(
                    item
                );
            }
        );
    }


    // --------------------------------------------------------
    // Full render
    // --------------------------------------------------------

    function render() {

        renderCurrent();
        renderCounts();
        renderList();
    }


    // --------------------------------------------------------
    // Call next waiting queue
    // --------------------------------------------------------

    async function callNext() {

        const current =
            QMS.getCurrentServing(
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

        const next =
            QMS.getNextWaitingQueue(
                session.department,
                serviceFilter.value
            );

        if (!next) {

            showMessage(
                "There are no waiting queues for the selected service.",
                "info"
            );

            return;
        }

        const result =
            await QMS.callQueue(
                next.queueNumber,
                session.department,
                session.counter,
                session.staffID
            );

        showMessage(
            result.message,
            result.success
                ? "success"
                : "error"
        );

        render();
    }


    // --------------------------------------------------------
    // Recall
    // --------------------------------------------------------

    recallButton.addEventListener(
        "click",
        async function () {

            const result =
                await QMS.recallCurrent(
                    session.department,
                    session.counter
                );

            showMessage(
                result.message,
                result.success
                    ? "success"
                    : "error"
            );

            render();
        }
    );


    // --------------------------------------------------------
    // Complete & Next
    // --------------------------------------------------------

    completeButton.addEventListener(
        "click",
        async function () {

            const completed =
                await QMS.completeCurrent(
                    session.department,
                    session.counter
                );

            if (!completed.success) {

                showMessage(
                    completed.message,
                    "error"
                );

                render();

                return;
            }

            const next =
                QMS.getNextWaitingQueue(
                    session.department,
                    serviceFilter.value
                );

            if (next) {

                const called =
                    await QMS.callQueue(
                        next.queueNumber,
                        session.department,
                        session.counter,
                        session.staffID
                    );

                showMessage(
                    called.success
                        ? `${completed.queue.queueNumber} completed. ${next.queueNumber} is now serving.`
                        : completed.message,
                    called.success
                        ? "success"
                        : "error"
                );

            } else {

                showMessage(
                    `${completed.queue.queueNumber} completed. No more waiting queues.`,
                    "success"
                );
            }

            render();
        }
    );


    // --------------------------------------------------------
    // Hold & Next
    // --------------------------------------------------------

    holdButton.addEventListener(
        "click",
        async function () {

            const held =
                await QMS.holdCurrent(
                    session.department,
                    session.counter
                );

            if (!held.success) {

                showMessage(
                    held.message,
                    "error"
                );

                render();

                return;
            }

            const next =
                QMS.getNextWaitingQueue(
                    session.department,
                    serviceFilter.value
                );

            if (next) {

                const called =
                    await QMS.callQueue(
                        next.queueNumber,
                        session.department,
                        session.counter,
                        session.staffID
                    );

                showMessage(
                    called.success
                        ? `${held.queue.queueNumber} placed on hold. ${next.queueNumber} is now serving.`
                        : held.message,
                    called.success
                        ? "success"
                        : "error"
                );

            } else {

                showMessage(
                    `${held.queue.queueNumber} placed on hold. No more waiting queues.`,
                    "success"
                );
            }

            render();
        }
    );


    // --------------------------------------------------------
    // Tabs
    // --------------------------------------------------------

    waitTab.addEventListener(
        "click",
        function () {

            activeTab =
                "WAIT";

            waitTab.classList.add(
                "active"
            );

            holdTab.classList.remove(
                "active"
            );

            renderList();
        }
    );

    holdTab.addEventListener(
        "click",
        function () {

            activeTab =
                "HOLD";

            holdTab.classList.add(
                "active"
            );

            waitTab.classList.remove(
                "active"
            );

            renderList();
        }
    );


    // --------------------------------------------------------
    // Filters
    // --------------------------------------------------------

    serviceFilter.addEventListener(
        "change",
        render
    );


    // --------------------------------------------------------
    // Search
    // --------------------------------------------------------

    searchButton.addEventListener(
        "click",
        searchQueueHistory
    );

    searchInput.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Enter") {
                searchQueueHistory();
            }
        }
    );

    closeTimelineButton.addEventListener(
        "click",
        function () {
            renderTimeline(null);
        }
    );



    // --------------------------------------------------------
    // Queue history timeline
    // --------------------------------------------------------

    function getTimelineHistory(queue) {

        if (
            Array.isArray(queue.history) &&
            queue.history.length
        ) {
            return queue.history
                .slice()
                .sort(
                    (a, b) =>
                        new Date(b.timestamp) -
                        new Date(a.timestamp)
                );
        }

        // Compatibility for queues created before history was added.
        const fallback = [];

        if (queue.issuedTime) {
            fallback.push({
                type: "ISSUED",
                timestamp: queue.issuedTime,
                counter: null,
                staffID: null
            });
        }

        if (queue.calledTime) {
            fallback.push({
                type: "CALLED",
                timestamp: queue.calledTime,
                counter: queue.counter || null,
                staffID: queue.calledBy || null
            });
        }

        if (queue.holdTime) {
            fallback.push({
                type: "HOLD",
                timestamp: queue.holdTime,
                counter: queue.counter || null,
                staffID: queue.calledBy || null
            });
        }

        if (queue.completedTime) {
            fallback.push({
                type: "COMPLETE",
                timestamp: queue.completedTime,
                counter: queue.counter || null,
                staffID: queue.calledBy || null
            });
        }

        return fallback.sort(
            (a, b) =>
                new Date(b.timestamp) -
                new Date(a.timestamp)
        );
    }


    function formatTimelineTime(value) {

        if (!value) {
            return "--:--:--";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "--:--:--";
        }

        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");

        return `${hours}:${minutes}:${seconds}`;
    }


    function renderTimeline(queue) {

        const mainView =
            document.getElementById("dashboardMainView");

        const timelineView =
            document.getElementById("queueTimelineView");

        if (!mainView || !timelineView) return;

        if (!queue) {
            mainView.style.display = "";
            timelineView.style.display = "none";
            queueTimeline.innerHTML = "";
            timelineQueueNumber.textContent = "";
            return;
        }

        mainView.style.display = "none";
        timelineView.style.display = "";

        timelineQueueNumber.textContent =
            `${queue.queueNumber} • ${queue.department} • ${queue.type}`;

        const history = getTimelineHistory(queue);

        queueTimeline.innerHTML = "";

        if (!history.length) {
            const empty = document.createElement("div");
            empty.className = "timeline-empty";
            empty.textContent = "No queue history is available.";
            queueTimeline.appendChild(empty);
            return;
        }

        // History is rendered newest -> oldest so the newest event is always at the top.
        history.forEach(event => {

            const item = document.createElement("div");
            const type = String(event.type || "").toLowerCase();

            item.className =
                `timeline-item timeline-${type}`;

            const time = document.createElement("time");
            time.className = "timeline-time";
            time.dateTime = event.timestamp || "";
            time.textContent = formatTimelineTime(event.timestamp);

            const marker = document.createElement("div");
            marker.className = "timeline-marker";

            const dot = document.createElement("span");
            marker.appendChild(dot);

            const content = document.createElement("div");
            content.className = "timeline-content";

            const message = document.createElement("p");
            message.className = "timeline-message";
            message.textContent =
                QMS.getHistoryMessage(event.type);

            content.appendChild(message);

            if (event.counter || event.staffID) {
                const meta = document.createElement("span");
                meta.className = "timeline-meta";

                const details = [];

                if (event.counter) {
                    details.push(event.counter);
                }

                if (event.staffID) {
                    details.push(event.staffID);
                }

                meta.textContent = details.join(" • ");
                content.appendChild(meta);
            }

            item.appendChild(time);
            item.appendChild(marker);
            item.appendChild(content);

            queueTimeline.appendChild(item);
        });
    }

    function searchQueueHistory() {

        const value =
            searchInput.value
                .trim()
                .toUpperCase();

        searchText = value;

        if (!value) {
            renderTimeline(null);
            renderList();
            return;
        }

        const queues =
            QMS.getDepartmentQueues(
                session.department
            );

        const queue =
            queues.find(
                item =>
                    String(item.queueNumber)
                        .toUpperCase() === value
            );

        if (!queue) {
            renderTimeline(null);

            showMessage(
                `Queue ${value} was not found in ${session.department}.`,
                "error"
            );

            renderList();

            return;
        }

        renderTimeline(queue);
        renderList();
    }


    // --------------------------------------------------------
    // Logout
    // --------------------------------------------------------

    logoutButton.addEventListener(
        "click",
        function () {

            QMS.clearSession();

            window.location.href =
                "login.html";
        }
    );


    // --------------------------------------------------------
    // Refresh when another tab changes localStorage
    // --------------------------------------------------------

    window.addEventListener(
        "storage",
        function (event) {

            if (
                event.key === QMS.STORAGE_KEYS.queues ||
                event.key === QMS.STORAGE_KEYS.updatedAt
            ) {

                render();

                const timelineNumber =
                    timelineQueueNumber &&
                    timelineQueueNumber.textContent
                        .split(" • ")[0];

                if (timelineNumber) {
                    const updatedQueue =
                        QMS.getDepartmentQueues(
                            session.department
                        ).find(
                            queue =>
                                queue.queueNumber === timelineNumber
                        );

                    if (updatedQueue) {
                        renderTimeline(updatedQueue);
                    }
                }
            }
        }
    );


    // --------------------------------------------------------
    // Polling is important for separate browser tabs/windows.
    // --------------------------------------------------------

    setInterval(
        render,
        1000
    );


    // Initial render
    render();
}