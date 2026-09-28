const departmentName =
    document.getElementById("departmentName");

const queueNumberElement =
    document.getElementById("queueNumber");

const patientsAheadElement =
    document.getElementById("patientsAhead");

const issuedTimeElement =
    document.getElementById("issuedTime");

const queueStatusElement =
    document.getElementById("queueStatus");

const countdownElement =
    document.getElementById("countdown");


const urlParams =
    new URLSearchParams(window.location.search);


const department =
    urlParams.get("department");

const queueNumber =
    urlParams.get("queue");

const issuedTime =
    urlParams.get("issued");


if (department) {

    departmentName.textContent =
        department;

}


if (queueNumber) {

    queueNumberElement.textContent =
        queueNumber;

}


if (issuedTime) {

    const date =
        new Date(issuedTime);


    issuedTimeElement.textContent =
        date.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

}


const queues =
    JSON.parse(
        localStorage.getItem("qmsQueues")
    ) || [];


const currentQueue =
    queues.find(
        queue =>
            queue.queueNumber === queueNumber
    );


if (currentQueue) {

    const currentIssuedTime =
        new Date(
            currentQueue.issuedTime
        );


    const patientsAhead =
        queues.filter(queue => {

            if (
                queue.department !== department
            ) {
                return false;
            }


            if (
                queue.status !== "WAIT"
            ) {
                return false;
            }


            const queueIssuedTime =
                new Date(
                    queue.issuedTime
                );


            return (
                queueIssuedTime <
                currentIssuedTime
            );

        }).length;


    patientsAheadElement.textContent =
        patientsAhead;


    queueStatusElement.textContent =
        "Waiting";

}


else {

    patientsAheadElement.textContent =
        "0";

    queueStatusElement.textContent =
        "Waiting";

}


let countdown = 6;


const countdownTimer =
    setInterval(function () {

        countdown--;

        countdownElement.textContent =
            countdown;


        if (countdown <= 0) {

            clearInterval(countdownTimer);


            window.location.href =
                "kiosk.html?department=" +
                encodeURIComponent(
                    department
                );

        }

    }, 1000);