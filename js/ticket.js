const departmentName =
    document.getElementById("departmentName");

const queueNumberElement =
    document.getElementById("queueNumber");

const issuedTimeElement =
    document.getElementById("issuedTime");

const qrCodeElement =
    document.getElementById("qrCode");

const urlParams =
    new URLSearchParams(
        window.location.search
    );


const department =
    urlParams.get("department");


const queueNumber =
    urlParams.get("queue");


if (department) {

    departmentName.textContent =
        department;

}


if (queueNumber) {

    queueNumberElement.textContent =
        queueNumber;

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


if (
    currentQueue &&
    currentQueue.issuedTime
) {

    const issuedDate =
        new Date(
            currentQueue.issuedTime
        );


    if (!isNaN(issuedDate.getTime())) {

        issuedTimeElement.textContent =
            issuedDate.toLocaleTimeString(
                "en-MY",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                }
            );

    } else {

        issuedTimeElement.textContent =
            "Invalid time";

    }

} else {

    issuedTimeElement.textContent =
        "--";

}

// Display QR Code (No Functionality, just for visual representation) //

if (queueNumber) {

    qrCodeElement.innerHTML = "";

    const temporaryTrackingValue =
        "QUEUE-" + queueNumber;


    new QRCode(
        qrCodeElement,
        {
            text:
                temporaryTrackingValue,

            width:
                150,

            height:
                150,

            correctLevel:
                QRCode.CorrectLevel.M
        }
    );

}