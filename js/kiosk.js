const getTicketButton =
    document.getElementById("getTicketButton");

const errorMessage =
    document.getElementById("errorMessage");

const department =
    QMS.getDepartmentFromUrl();


if (!department) {

    getTicketButton.disabled =
        true;

    errorMessage.textContent =
        "This kiosk has not been configured for a department.";

}


getTicketButton.addEventListener(
    "click",
    async function () {

        errorMessage.textContent =
            "";

        if (!department) {

            errorMessage.textContent =
                "This kiosk has not been configured for a department.";

            return;
        }

        getTicketButton.disabled =
            true;

        getTicketButton.innerHTML =
            '<i class="bi bi-hourglass-split"></i> Preparing Ticket...';

        try {

            const newQueue =
                await QMS.createWalkInQueue(
                    department
                );

            window.location.href =
                "ticket.html" +
                "?department=" +
                encodeURIComponent(
                    newQueue.department
                ) +
                "&queue=" +
                encodeURIComponent(
                    newQueue.queueNumber
                );

        } catch (error) {

            console.error(error);

            getTicketButton.disabled =
                false;

            getTicketButton.innerHTML =
                '<i class="bi bi-ticket-perforated"></i> Get Ticket';

            errorMessage.textContent =
                "Unable to issue a ticket. Please try again.";
        }
    }
);
