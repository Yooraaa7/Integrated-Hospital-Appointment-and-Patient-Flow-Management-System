const getTicketButton =
    document.getElementById("getTicketButton");

const errorMessage =
    document.getElementById("errorMessage");

const department =
    QMS.getDepartmentFromUrl();

if (!department) {
    getTicketButton.disabled = true;

    errorMessage.textContent =
        "This kiosk has not been configured for a department.";
}

getTicketButton.addEventListener(
    "click",
    async function () {

        errorMessage.textContent = "";

        if (!department) {
            errorMessage.textContent =
                "This kiosk has not been configured for a department.";
            return;
        }

        getTicketButton.disabled = true;

        getTicketButton.innerHTML =
            '<i class="bi bi-hourglass-split"></i> Preparing Ticket...';

        try {
            // Generate ticket through PostgreSQL API
            const newQueue =
                await QMS.createWalkInQueue(department);

            // Do not generate an untrackable QR code
            if (!newQueue.trackingToken) {
                errorMessage.textContent =
                    "Your ticket was issued, but QR tracking is " +
                    "unavailable. Please contact staff. " +
                    "Do not request another ticket.";
                return;
            }

            const ticketUrl = new URL(
                "ticket.html",
                window.location.href
            );

            ticketUrl.searchParams.set(
                "department",
                newQueue.department
            );

            ticketUrl.searchParams.set(
                "queue",
                newQueue.queueNumber
            );

            ticketUrl.searchParams.set(
                "token",
                newQueue.trackingToken
            );

            window.location.href = ticketUrl.href;

        } catch (error) {
            console.error(error);

            getTicketButton.disabled = false;

            getTicketButton.innerHTML =
                '<i class="bi bi-ticket-perforated"></i> Get Ticket';

            errorMessage.textContent =
                "Unable to issue a ticket. Please ask staff for assistance.";
        }
    }
);
