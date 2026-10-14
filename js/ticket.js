const departmentName =
    document.getElementById("departmentName");

const queueNumberElement =
    document.getElementById("queueNumber");

const issuedTimeElement =
    document.getElementById("issuedTime");

const qrCodeElement =
    document.getElementById("qrCode");

const urlParams =
    new URLSearchParams(window.location.search);

const trackingToken = urlParams.get("token");

const qrSection = document.querySelector(".qr-section");

// Find or create the tracking message
let trackingHint =
    document.getElementById("trackingHint");

if (!trackingHint) {
    trackingHint = document.createElement("p");
    trackingHint.id = "trackingHint";
    trackingHint.className = "qr-description";
    qrSection.appendChild(trackingHint);
}

// Find or create the tracking button
let trackingLink =
    document.getElementById("trackingLink");

if (!trackingLink) {
    trackingLink = document.createElement("a");
    trackingLink.id = "trackingLink";
    trackingLink.className =
        "btn btn-outline-primary btn-sm";

    trackingLink.textContent = "Open Live Tracking";
    trackingLink.target = "_blank";
    trackingLink.rel = "noopener noreferrer";
    trackingLink.hidden = true;

    qrSection.appendChild(trackingLink);
}

async function loadTicket() {
    if (!trackingToken) {
        departmentName.textContent =
            urlParams.get("department") || "Unknown department";

        queueNumberElement.textContent =
            urlParams.get("queue") || "---";

        issuedTimeElement.textContent = "--";

        trackingHint.textContent =
            "This ticket does not have a tracking token.";

        trackingLink.hidden = true;
        return;
    }

    try {
        const response = await fetch(
            `/api/tracking/${encodeURIComponent(trackingToken)}`,
            { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Unable to load ticket"
            );
        }

        // Populate ticket using the actual PostgreSQL record
        departmentName.textContent =
            result.queue.department_name;

        queueNumberElement.textContent =
            result.queue.queue_number;

        issuedTimeElement.textContent =
            result.queue.issued_at
                ? new Date(
                    result.queue.issued_at
                ).toLocaleTimeString("en-MY", {
                    hour: "2-digit",
                    minute: "2-digit"
                })
                : "--";

        // Generate unique tracking link
        const trackingUrl = new URL(
            "tracking.html",
            window.location.href
        );

        trackingUrl.search = "";

        trackingUrl.searchParams.set(
            "token",
            trackingToken
        );

        // Provide clickable link
        trackingLink.href = trackingUrl.href;
        trackingLink.hidden = false;

        // Generate actual QR code
        qrCodeElement.replaceChildren();

        if (typeof QRCode === "undefined") {
            throw new Error("QR code library failed to load");
        }

        new QRCode(qrCodeElement, {
            text: trackingUrl.href,
            width: 150,
            height: 150,
            correctLevel: QRCode.CorrectLevel.M
        });

            trackingHint.textContent =
                "Scan this QR code to track your queue live.";

    } catch (error) {
        console.error("Ticket QR error:", error);

        trackingHint.textContent =
            "Unable to generate live tracking: " +
            error.message;
    }
}

loadTicket();
