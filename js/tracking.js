
const params = new URLSearchParams(window.location.search);
const trackingToken = params.get("token");

const el = (id) => document.getElementById(id);

const statusMessages = {
    WAIT: {
        title: "Waiting",
        message: "Please wait for your queue number to be called."
    },

    SERVING: {
        title: "Now Serving",
        message: "It's your turn! Please proceed to your assigned counter."
    },

    HOLD: {
        title: "On Hold",
        message: "Your queue is temporarily on hold. Please wait for staff instructions."
    },

    COMPLETED: {
        title: "Completed",
        message: "Your queue has been completed. Thank you for visiting!"
    }
};

let isLoading = false;

function updateQueueProgress(data) {
    const servingContainer = el("nowServing");
    servingContainer.replaceChildren();

    const servingQueues = data.now_serving || [];

    if (servingQueues.length === 0) {
        const empty = document.createElement("span");
        empty.className = "empty-message";
        empty.textContent = "No queues currently serving";
        servingContainer.appendChild(empty);
    } else {
        servingQueues.forEach((item) => {
            const ticket = document.createElement("div");
            ticket.className = "serving-ticket";

            const number = document.createElement("strong");
            number.textContent = item.queue_number;
            ticket.appendChild(number);

            if (item.counter_number != null) {
                const counter = document.createElement("small");
                counter.textContent =
                    `Counter ${item.counter_number}`;
                ticket.appendChild(counter);
            }

            servingContainer.appendChild(ticket);
        });
    }

    el("nextQueue").textContent =
        data.next_in_queue?.queue_number || "None";
}

function renderQueue(data) {
    const queue = data.queue;
    const status = queue.status;

    const statusInfo = statusMessages[status] || {
        title: status,
        message: "Please contact hospital staff for assistance."
    };

    // Basic ticket information
    el("departmentName").textContent = queue.department_name;
    el("queueNumber").textContent = queue.queue_number;

    // Status panel
    el("statusPanel").dataset.status = status;
    el("queueStatus").textContent = statusInfo.title;
    el("statusMessage").textContent = statusInfo.message;

    // Only WAIT and HOLD show current/next queue numbers
    const showProgress =
        status === "WAIT" || status === "HOLD";

    el("queueProgress").hidden = !showProgress;

    if (showProgress) {
        updateQueueProgress(data);
    }

    // Only SERVING shows the assigned counter
    const showCounter = status === "SERVING";

    el("counterPanel").hidden = !showCounter;

    if (showCounter) {
        el("assignedCounter").textContent =
            queue.counter_number != null
                ? `Counter ${queue.counter_number}`
                : "Please ask hospital staff";
    }

    // Last update time
    el("lastUpdated").textContent =
        "Last updated: " +
        new Date(data.checked_at).toLocaleTimeString("en-MY");

    el("errorMessage").hidden = true;
}

async function refreshTracking() {
    if (isLoading || !trackingToken) {
        return;
    }

    isLoading = true;

    try {
        const response = await fetch(
            `/api/tracking/${encodeURIComponent(trackingToken)}`,
            {
                cache: "no-store"
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Unable to retrieve queue status"
            );
        }

        renderQueue(data);

    } catch (error) {
        console.error("Tracking error:", error);

        el("errorMessage").textContent =
            "Unable to update your queue right now. " +
            "We will try again automatically.";

        el("errorMessage").hidden = false;

        el("lastUpdated").textContent =
            "Connection interrupted — retrying...";

    } finally {
        isLoading = false;
    }
}

// Initialise tracking page
if (!trackingToken) {
    el("errorMessage").textContent =
        "Invalid tracking link. Please scan the QR code on your ticket.";

    el("errorMessage").hidden = false;

    el("lastUpdated").textContent =
        "Tracking link required";

} else {
    refreshTracking();

    // Refresh every 5 seconds
    setInterval(refreshTracking, 5000);

    // Refresh immediately when the patient returns to the tab
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            refreshTracking();
        }
    });
}
