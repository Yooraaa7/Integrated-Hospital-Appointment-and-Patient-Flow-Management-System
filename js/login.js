
const form = document.getElementById("loginForm");
const departmentSelect = document.getElementById("department");
const counterSelect = document.getElementById("counter");
const notificationContainer = document.getElementById("loginNotifications");

// Display one or multiple error notifications
function showLoginErrors(errors) {
    const messages = Array.isArray(errors) ? errors : [errors];

    messages
        .filter(message => typeof message === "string" && message.trim())
        .forEach(message => {
            const toast = document.createElement("div");
            toast.className = "login-toast";

            const icon = document.createElement("div");
            icon.className = "login-toast-icon";
            icon.textContent = "!";

            const content = document.createElement("div");
            content.className = "login-toast-content";

            const title = document.createElement("div");
            title.className = "login-toast-title";
            title.textContent = "Login unsuccessful";

            const description = document.createElement("div");
            description.className = "login-toast-message";
            description.textContent = getFriendlyErrorMessage(message);

            const closeButton = document.createElement("button");
            closeButton.className = "login-toast-close";
            closeButton.type = "button";
            closeButton.textContent = "×";
            closeButton.setAttribute("aria-label", "Dismiss notification");

            content.appendChild(title);
            content.appendChild(description);

            toast.appendChild(icon);
            toast.appendChild(content);
            toast.appendChild(closeButton);

            notificationContainer.appendChild(toast);

            let removeTimer;

            function removeToast() {
                if (toast.classList.contains("removing")) return;

                clearTimeout(removeTimer);
                toast.classList.add("removing");

                toast.addEventListener("animationend", () => {
                    toast.remove();
                }, { once: true });
            }

            closeButton.addEventListener("click", removeToast);

            removeTimer = setTimeout(removeToast, 7000);
        });
}

// Convert backend error messages into user-friendly messages
function getFriendlyErrorMessage(message) {
    const text = String(message).toLowerCase();

    if (
        text.includes("invalid staff") ||
        text.includes("invalid credential") ||
        text.includes("incorrect password") ||
        text.includes("wrong password") ||
        text.includes("user not found")
    ) {
        return "Wrong staff ID or password. Please check your credentials.";
    }

    if (
        text.includes("counter occupied") ||
        text.includes("counter is occupied") ||
        text.includes("already in use")
    ) {
        return "This counter is currently occupied by another staff member. Please select another counter.";
    }

    return message;
}

// Clear all existing notifications
function clearLoginErrors() {
    notificationContainer.innerHTML = "";
}

async function setupLogin() {
    try {
        const departments = await QMS_API.metadata();

        departmentSelect.innerHTML =
            '<option value="">Select Department</option>';

        departments.forEach(d => {
            departmentSelect.add(
                new Option(d.department_name, d.id)
            );
        });

        departmentSelect.addEventListener("change", () => {
            counterSelect.innerHTML =
                '<option value="">Select Counter</option>';

            for (const c of QMS_API.counters.values()) {
                if (String(c.department_id) === departmentSelect.value) {
                    counterSelect.add(
                        new Option(`Counter ${c.counter_number}`, c.id)
                    );
                }
            }

            counterSelect.disabled = !departmentSelect.value;
        });

    } catch (err) {
        showLoginErrors("Cannot load departments: " + err.message);
    }
}

form.addEventListener("submit", async e => {
    e.preventDefault();

    clearLoginErrors();

    const loginButton = form.querySelector(".login-button");
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    try {
        const data = await QMS_API.post("/auth/login", {
            staff_id: document.getElementById("staffID").value.trim(),
            password: document.getElementById("password").value,
            department_id: Number(departmentSelect.value),
            counter_id: Number(counterSelect.value)
        });

        sessionStorage.setItem("qmsToken", data.token);
        sessionStorage.setItem("staffID", data.staff.staff_id);
        sessionStorage.setItem("department", data.staff.department);
        sessionStorage.setItem("counter", data.staff.counter);

        location.href = "dashboard.html";

    } catch (err) {
        // Support single errors and multiple errors from the backend
        const errors =
            err.errors ||
            err.messages ||
            err.response?.data?.errors ||
            err.response?.data?.messages ||
            err.message ||
            "Login failed. Please try again.";

        showLoginErrors(errors);

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Login";
    }
});

setupLogin();
