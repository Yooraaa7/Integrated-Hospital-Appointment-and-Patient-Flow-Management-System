const department =
    QMS.getDepartmentFromUrl();

const departmentName =
    document.getElementById(
        "displayDepartment"
    );

const displayTime =
    document.getElementById(
        "displayTime"
    );

const servingNumber =
    document.getElementById(
        "servingNumber"
    );

const counterLabel =
    document.getElementById(
        "counterLabel"
    );

const nextList =
    document.getElementById(
        "nextList"
    );

const activeCounterList =
    document.getElementById(
        "activeCounterList"
    );

const displayError =
    document.getElementById(
        "displayError"
    );


function updateClock() {

    displayTime.textContent =
        new Date().toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );
}


function renderDisplay() {

    if (!department) {

        departmentName.textContent =
            "Department Display";

        displayError.textContent =
            "This display has not been configured for a department.";

        return;
    }

    displayError.textContent =
        "";

    departmentName.textContent =
        `${department} Department`;


    const queues =
        QMS.getDepartmentQueues(
            department
        );


    const active =
        QMS.getActiveServing(
            department
        );

    const latest =
        active[0] || null;


    if (!latest) {

        servingNumber.textContent =
            "—";

        counterLabel.textContent =
            "No queue is currently being served.";

    } else {

        servingNumber.textContent =
            latest.queueNumber;

        counterLabel.innerHTML =
            `Please proceed to <strong>${latest.counter}</strong>`;
    }


    activeCounterList.innerHTML =
        "";

    active.forEach(
        queue => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "active-counter-item";

            item.innerHTML =
                `<span>${queue.counter}</span>` +
                `<strong>${queue.queueNumber}</strong>`;

            activeCounterList.appendChild(
                item
            );
        }
    );


    if (!active.length) {

        const item =
            document.createElement(
                "div"
            );

        item.className =
            "active-counter-empty";

        item.textContent =
            "All counters are ready.";

        activeCounterList.appendChild(
            item
        );
    }


    const nextQueues =
        queues
            .filter(
                queue =>
                    queue.status === "WAIT"
            )
            .sort(
                (a, b) =>
                    new Date(a.issuedTime) -
                    new Date(b.issuedTime)
            )
            .slice(0, 5);


    nextList.innerHTML =
        "";

    if (!nextQueues.length) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "next-empty";

        empty.textContent =
            "No patients waiting.";

        nextList.appendChild(
            empty
        );

    } else {

        nextQueues.forEach(
            queue => {

                const item =
                    document.createElement(
                        "div"
                    );

                item.textContent =
                    queue.queueNumber;

                nextList.appendChild(
                    item
                );
            }
        );
    }
}


updateClock();
renderDisplay();


setInterval(
    updateClock,
    1000
);

setInterval(
    renderDisplay,
    1000
);

window.addEventListener(
    "storage",
    renderDisplay
);
