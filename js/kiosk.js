const getTicketButton =
    document.getElementById("getTicketButton");

const errorMessage =
    document.getElementById("errorMessage");


const departmentPrefixes = {

    "General Medicine": "GM",

    "Cardiology": "CD",

    "Orthopaedics": "OR",

    "Dermatology": "DR",

    "Paediatrics": "PD",

    "Ophthalmology": "OP"

};


const urlParams =
    new URLSearchParams(window.location.search);

const department =
    urlParams.get("department");



if (
    !department ||
    !departmentPrefixes[department]
) {

    getTicketButton.disabled = true;

    getTicketButton.style.opacity = "0.5";

    errorMessage.textContent =
        "This kiosk has not been configured for a department.";

}


getTicketButton.addEventListener(
    "click",
    function () {

        errorMessage.textContent = "";


        if (
            !department ||
            !departmentPrefixes[department]
        ) {

            errorMessage.textContent =
                "This kiosk has not been configured for a department.";

            return;

        }


        const prefix =
            departmentPrefixes[department];


        let queueCounters =
            JSON.parse(
                localStorage.getItem(
                    "qmsQueueCounters"
                )
            ) || {};


        if (!queueCounters[prefix]) {

            queueCounters[prefix] = 0;

        }

        queueCounters[prefix]++;


        localStorage.setItem(
            "qmsQueueCounters",
            JSON.stringify(queueCounters)
        );


        const queueNumber =
            prefix +
            String(
                queueCounters[prefix]
            ).padStart(3, "0");


        const issuedTime =
            new Date().toISOString();


        const newQueue = {

            queueNumber: queueNumber,

            department: department,

            type: "Walk-In",

            status: "WAIT",

            counter: null,

            issuedTime: issuedTime

        };


        let queues =
            JSON.parse(
                localStorage.getItem("qmsQueues")
            ) || [];


        queues.push(newQueue);


        localStorage.setItem(
            "qmsQueues",
            JSON.stringify(queues)
        );


        window.location.href =
            "ticket.html" +
            "?department=" +
            encodeURIComponent(department) +
            "&queue=" +
            encodeURIComponent(queueNumber) +
            "&type=Walk-In" +
            "&issued=" +
            encodeURIComponent(issuedTime);

    }
);