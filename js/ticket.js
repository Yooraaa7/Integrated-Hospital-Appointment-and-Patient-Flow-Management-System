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


// Ticket information is retrieved from PostgreSQL, not localStorage.
(async () => {
    try {
        const response = await fetch('/api/queues');
        if (!response.ok) throw new Error('Queue server unavailable');
        const result = await response.json();
        const current = (result.queues || []).find(q => q.queue_number === queueNumber);
        issuedTimeElement.textContent = current && current.issued_at
            ? new Date(current.issued_at).toLocaleTimeString('en-MY', {
                hour:'2-digit', minute:'2-digit',hour12:true
              })
            : '--';
    } catch (error) {
        issuedTimeElement.textContent = '--';
        console.error(error);
    }
})();

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