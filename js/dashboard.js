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

    const counterFilter =
        document.getElementById(
            "counterFilter"
        );

    const timeFilter =
        document.getElementById(
            "timeFilter"
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

        const timeRange =
            timeFilter.value;

        const selectedCounter =
            counterFilter.value;

        const search =
            searchText.toUpperCase();


        if (
            service !== "ALL" &&
            queue.type !== service
        ) {
            return false;
        }


        if (
            !QMS.isWithinTimeRange(
                queue.issuedTime,
                timeRange
            )
        ) {
            return false;
        }


        if (
            activeTab === "HOLD" &&
            selectedCounter !== "ALL" &&
            queue.counter !== selectedCounter
        ) {
            return false;
        }


        if (
            search &&
            !queue.queueNumber
                .toUpperCase()
                .includes(search)
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
                        ? "Resume"
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
                                    ? "bi-play-fill"
                                    : "bi-megaphone"
                            }"></i>
                            ${actionText}
                        </button>
                    </div>
                `;


                const call =
                    function () {

                        const result =
                            QMS.callQueue(
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

    function callNext() {

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
            QMS.callQueue(
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
        function () {

            const result =
                QMS.recallCurrent(
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
        function () {

            const completed =
                QMS.completeCurrent(
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
                    QMS.callQueue(
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
        function () {

            const held =
                QMS.holdCurrent(
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
                    QMS.callQueue(
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

    counterFilter.addEventListener(
        "change",
        renderList
    );

    timeFilter.addEventListener(
        "change",
        renderList
    );


    // --------------------------------------------------------
    // Search
    // --------------------------------------------------------

    function applySearch() {

        searchText =
            searchInput.value
                .trim()
                .toUpperCase();

        renderList();
    }

    searchButton.addEventListener(
        "click",
        applySearch
    );

    searchInput.addEventListener(
        "input",
        applySearch
    );


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
