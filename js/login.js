const loginForm =
    document.getElementById("loginForm");

const departmentSelect =
    document.getElementById("department");

const counterSelect =
    document.getElementById("counter");

const staffIDInput =
    document.getElementById("staffID");

const passwordInput =
    document.getElementById("password");

const loginError =
    document.getElementById("loginError");


departmentSelect.addEventListener(
    "change",
    function () {

        counterSelect.disabled =
            !departmentSelect.value;

        counterSelect.selectedIndex =
            0;

        loginError.textContent =
            "";
    }
);


loginForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        loginError.textContent =
            "";

        const selectedDepartment =
            QMS.normalizeDepartment(
                departmentSelect.value
            );

        const selectedCounter =
            counterSelect.value;

        const staffID =
            staffIDInput.value.trim();

        const password =
            passwordInput.value;

        if (!selectedDepartment) {

            loginError.textContent =
                "Please select a department.";

            return;
        }

        if (!selectedCounter) {

            loginError.textContent =
                "Please select a counter.";

            return;
        }

        const account =
            QMS.validateStaffLogin(
                staffID,
                password
            );

        if (!account) {

            loginError.textContent =
                "Invalid Staff ID or password.";

            passwordInput.focus();

            return;
        }


        sessionStorage.setItem(
            "department",
            selectedDepartment
        );

        sessionStorage.setItem(
            "counter",
            selectedCounter
        );

        sessionStorage.setItem(
            "staffID",
            account.staffID
        );


        window.location.href =
            "dashboard.html";
    }
);
