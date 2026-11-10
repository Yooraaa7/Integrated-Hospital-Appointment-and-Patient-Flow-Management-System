
const DOCTORS = [
    {
        id: "sarah",
        name: "Dr. Sarah Lee",
        initials: "SL",
        specialty: "Cardiology",
        position: "Consultant Cardiologist",
        languages: "English, Malay, Mandarin",
        qualifications: "MBBS, MRCP",
        experience: "12 Years",
        about: "Dr. Sarah Lee provides cardiovascular assessment, cardiac screening and follow-up care.",
        interests: ["Heart Health", "Hypertension", "Cardiac Screening", "Preventive Cardiology"],
        schedule: {
            Monday: ["09:00", "10:00", "11:00"],
            Wednesday: ["14:00", "15:00", "16:00"],
            Friday: ["09:00", "10:00", "11:00", "12:00"]
        }
    },
    {
        id: "daniel",
        name: "Dr. Daniel Wong",
        initials: "DW",
        specialty: "Neurology",
        position: "Consultant Neurologist",
        languages: "English, Malay",
        qualifications: "MBBS, MRCP",
        experience: "10 Years",
        about: "Dr. Daniel Wong provides neurological assessment and management for common neurological conditions.",
        interests: ["Headache", "Migraine", "Stroke Care", "Neurological Assessment"],
        schedule: {
            Tuesday: ["09:00", "10:00", "11:00"],
            Thursday: ["14:00", "15:00", "16:00"],
            Saturday: ["09:00", "10:00", "11:00"]
        }
    },
    {
        id: "ahmad",
        name: "Dr. Ahmad Rahman",
        initials: "AR",
        specialty: "Orthopaedics",
        position: "Consultant Orthopaedic Surgeon",
        languages: "English, Malay",
        qualifications: "MBBS, MS Orthopaedics",
        experience: "15 Years",
        about: "Dr. Ahmad Rahman assesses and treats musculoskeletal and orthopaedic conditions.",
        interests: ["Joint Pain", "Sports Injuries", "Back Pain", "Bone Health"],
        schedule: {
            Monday: ["14:00", "15:00", "16:00"],
            Wednesday: ["09:00", "10:00", "11:00"],
            Friday: ["14:00", "15:00", "16:00"]
        }
    },
    {
        id: "michelle",
        name: "Dr. Michelle Tan",
        initials: "MT",
        specialty: "Paediatrics",
        position: "Consultant Paediatrician",
        languages: "English, Malay, Mandarin",
        qualifications: "MBBS, MRCPCH",
        experience: "9 Years",
        about: "Dr. Michelle Tan provides healthcare consultation for infants, children and adolescents.",
        interests: ["Child Health", "Growth & Development", "General Paediatrics", "Childhood Illness"],
        schedule: {
            Tuesday: ["09:00", "10:00", "11:00"],
            Thursday: ["09:00", "10:00", "11:00", "12:00"],
            Saturday: ["10:00", "11:00", "12:00"]
        }
    },
    {
        id: "priya",
        name: "Dr. Priya Kumar",
        initials: "PK",
        specialty: "Dermatology",
        position: "Consultant Dermatologist",
        languages: "English, Malay, Tamil",
        qualifications: "MBBS, MRCP",
        experience: "11 Years",
        about: "Dr. Priya Kumar provides consultation for a range of skin-related conditions.",
        interests: ["Skin Conditions", "Acne", "Eczema", "General Dermatology"],
        schedule: {
            Monday: ["10:00", "11:00", "12:00"],
            Wednesday: ["14:00", "15:00", "16:00", "17:00"],
            Saturday: ["09:00", "10:00", "11:00"]
        }
    },
    {
        id: "lim",
        name: "Dr. Lim Wei Jian",
        initials: "LW",
        specialty: "General Medicine",
        position: "Consultant Physician",
        languages: "English, Malay, Mandarin",
        qualifications: "MBBS, MRCP",
        experience: "13 Years",
        about: "Dr. Lim Wei Jian provides general medical assessment and continuing adult care.",
        interests: ["General Medicine", "Health Screening", "Chronic Disease", "Preventive Healthcare"],
        schedule: {
            Monday: ["09:00", "10:00", "11:00"],
            Tuesday: ["14:00", "15:00", "16:00"],
            Thursday: ["09:00", "10:00", "11:00", "12:00"]
        }
    }
];

const ROUTES = [
    { department: "Cardiology", keywords: ["chest pain", "heart", "palpitation", "shortness of breath", "high blood pressure", "hypertension"] },
    { department: "Neurology", keywords: ["headache", "migraine", "dizziness", "seizure", "numbness", "stroke"] },
    { department: "Orthopaedics", keywords: ["joint pain", "back pain", "bone", "fracture", "knee", "shoulder", "sports injury"] },
    { department: "Paediatrics", keywords: ["child", "children", "baby", "infant", "fever child", "growth"] },
    { department: "Dermatology", keywords: ["skin", "rash", "acne", "eczema", "itch", "mole"] },
    { department: "General Medicine", keywords: ["fever", "cough", "flu", "tired", "fatigue", "checkup", "general", "screening"] }
];

const q = selector => document.querySelector(selector);
const qa = selector => [...document.querySelectorAll(selector)];

const AUTH_API_URL = "https://thecare-patient-backend.onrender.com/api/auth";

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
}

function getRoot() {
    return document.body.dataset.root || "";
}

function getUser() {
    return JSON.parse(localStorage.getItem("careUser") || "null");
}

function setUser(value) {
    localStorage.setItem("careUser", JSON.stringify(value));
}

function getRegisteredUsers() {
    return JSON.parse(localStorage.getItem("careRegisteredUsers") || "[]");
}

function saveRegisteredUsers(value) {
    localStorage.setItem("careRegisteredUsers", JSON.stringify(value));
}

function getAppointments() {
    return JSON.parse(localStorage.getItem("careAppointments") || "[]");
}

function saveAppointments(value) {
    localStorage.setItem("careAppointments", JSON.stringify(value));
}

function getQMSQueue() {
    return JSON.parse(localStorage.getItem("careQMSQueue") || "[]");
}

function saveQMSQueue(value) {
    localStorage.setItem("careQMSQueue", JSON.stringify(value));
}


/* =========================
   PATIENT APPOINTMENT API
========================= */

const APPOINTMENT_API_ROOT =
    typeof AUTH_API_URL !== "undefined"
        ? AUTH_API_URL.replace(/\/auth\/?$/, "")
        : "http://localhost:3001/api";

async function patientApiRequest(path, options = {}) {
    const token = localStorage.getItem("careToken");

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${APPOINTMENT_API_ROOT}${path}`, {
        ...options,
        headers
    });

    let data;

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (response.status === 401) {
        alert("Your login session has expired. Please log in again.");
        localStorage.removeItem("careUser");
        localStorage.removeItem("careToken");
        location.href = getRoot() + "login.html";
        throw new Error("Login required.");
    }

    if (!response.ok || data.success === false) {
        throw new Error(data.message || "The request could not be completed.");
    }

    return data;
}

/* =========================
   QMS PATIENT QUEUE API
========================= */

// QMS backend runs on port 3000.
// Patient appointment APIs continue using port 3001.
const QMS_API_ROOT = "https://thecare-qms-backend.onrender.com/api";

async function qmsPatientRequest(path, options = {}) {
    const token = localStorage.getItem("careToken");

    if (!token) {
        alert("Please log in to your patient account.");

        localStorage.setItem(
            "careReturnTo",
            location.href
        );

        location.href = getRoot() + "login.html";

        throw new Error("Patient login required.");
    }

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        "Authorization": `Bearer ${token}`
    };

    const response = await fetch(
        `${QMS_API_ROOT}${path}`,
        {
            ...options,
            headers
        }
    );

    let data;

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (response.status === 401) {
        alert(
            "Your patient login session is invalid or has expired. Please log in again."
        );

        localStorage.removeItem("careUser");
        localStorage.removeItem("careToken");

        location.href = getRoot() + "login.html";

        throw new Error("Patient authentication required.");
    }

    if (!response.ok || data.success === false) {
        throw new Error(
            data.message ||
            data.error ||
            `QMS request failed (${response.status}).`
        );
    }

    return data;
}

function appointmentFromApi(row) {
    const scheduled = new Date(row.scheduled_at);

    const date =
        `${scheduled.getFullYear()}-` +
        `${String(scheduled.getMonth() + 1).padStart(2, "0")}-` +
        `${String(scheduled.getDate()).padStart(2, "0")}`;

    const time =
        `${String(scheduled.getHours()).padStart(2, "0")}:` +
        `${String(scheduled.getMinutes()).padStart(2, "0")}`;

    const rawStatus = String(row.status || "").toUpperCase();

    const statusMap = {
        BOOKED: "Confirmed",
        CONFIRMED: "Confirmed",
        CANCELLED: "Cancelled",
        COMPLETED: "Completed",
        CHECKED_IN: "Checked In",
        NO_SHOW: "No Show"
    };

    const selectedDoctor = doctorById(String(row.doctor_id || ""));

    return {
        id: String(row.id),
        patientId: String(row.patient_id),
        doctorId: String(row.doctor_id || ""),
        doctorName: selectedDoctor?.name ||
            (row.doctor_id ? `Doctor ${row.doctor_id}` : "Doctor to be assigned"),
        specialty: row.department_name || "",
        departmentId: row.department_id,
        departmentCode: row.department_code || "",
        date,
        time,
        status: statusMap[rawStatus] || row.status || "Confirmed",
        createdAt: row.created_at,
        updatedAt: row.updated_at,

        // The current API does not store these fields.
        notes: row.notes || "",
        queueNumber: null,
        queueStatus: null,
        registeredAt: null
    };
}

async function fetchPatientAppointments() {
    const data = await patientApiRequest("/appointments");
    return (data.appointments || []).map(appointmentFromApi);
}

function getLocalAppointmentDateTime(date, time) {
    return new Date(`${date}T${time}:00`).toISOString();
}

function doctorById(id) {
    return DOCTORS.find(doctor => doctor.id === id);
}

function formatDate(value) {
    if (!value) return "";
    return new Date(value + "T00:00:00").toLocaleDateString("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function formatClock(value) {
    if (!value) return "—";
    return new Date(value).toLocaleTimeString("en-MY", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function statusClass(status) {
    if (status === "Confirmed") return "status-success";
    if (status === "Cancelled") return "status-danger";
    if (status === "Completed") return "status-info";
    return "status-warning";
}

function localToday() {
    const now = new Date();
    return (
        now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0")
    );
}

function isLoggedIn() {
    return !!getUser();
}

function requireLogin(returnTo = location.href) {
    if (isLoggedIn()) return true;

    localStorage.setItem("careReturnTo", returnTo);
    location.href = getRoot() + "login.html";
    return false;
}

function logoutPatient() {
    localStorage.removeItem("careUser");
    localStorage.removeItem("careToken");

    location.href = getRoot() + "index.html";
}

function renderShell() {
    const nav = q("#nav");
    const foot = q("#foot");
    if (!nav) return;

    const root = getRoot();
    const active = document.body.dataset.page || "";
    const user = getUser();

    function navLink(key, label, path, loginRequired = false) {
        const extra = loginRequired ? ' data-protected-nav="true"' : "";
        return `<a href="${root}${path}" class="${active === key ? "active" : ""}"${extra}>${label}</a>`;
    }

    nav.innerHTML = `
        <header class="top-navbar">
            <div class="navbar-content">

                <a
                    class="navbar-logo"
                    href="${root}${user ? "pages/patient_dashboard.html" : "index.html"}"
                >
                    <img src="${root}assets/logo.png" alt="The Care Hospital">
                </a>

                <nav class="navbar-links">
                    ${navLink(
                        "home",
                        "Home",
                        user ? "pages/patient_dashboard.html" : "index.html"
                    )}
                    ${navLink("doctors", "Find a Doctor", "pages/doctors.html")}
                    ${navLink("department", "Department Routing", "pages/department.html")}
                    ${navLink("appointments", "My Appointments", "pages/appointment_history.html", true)}
                </nav>

                <div class="nav-user">
                    ${
                        user
                            ? `
                                <div class="notification-wrapper">

                                    <button
                                        class="notification-button"
                                        type="button"
                                        id="notificationButton"
                                        title="Notifications"
                                    >
                                        <i class="bi bi-bell"></i>

                                        <span
                                            class="notification-badge hidden"
                                            id="notificationBadge"
                                        >
                                            0
                                        </span>
                                    </button>


                                    <div
                                        class="notification-dropdown hidden"
                                        id="notificationDropdown"
                                    >

                                        <div class="notification-header">

                                            <strong>
                                                Notifications
                                            </strong>

                                            <button
                                                type="button"
                                                id="markNotificationsRead"
                                            >
                                                Mark all as read
                                            </button>

                                        </div>


                                        <div
                                            class="notification-list"
                                            id="notificationList"
                                        >
                                        </div>

                                    </div>

                                </div>


                                <a
                                    class="btn btn-outline"
                                    href="${root}pages/patient_profile.html"
                                >
                                    <i class="bi bi-person"></i>

                                    Profile
                                </a>


                                <button
                                    class="btn btn-danger"
                                    type="button"
                                    id="logoutButton"
                                >
                                    <i class="bi bi-box-arrow-right"></i>

                                    Logout
                                </button>
                            `
                            : `
                                <a class="btn btn-outline" href="${root}login.html">
                                    <i class="bi bi-box-arrow-in-right"></i>
                                    Login
                                </a>
                            `
                    }
                </div>

                <a class="btn btn-primary" href="${root}pages/appointment.html" id="startAppointmentNav">
                    <i class="bi bi-calendar-plus"></i>
                    Start Appointment
                </a>

            </div>
        </header>
    `;

    if (foot) {
        foot.innerHTML = `
            <footer class="footer">
                <div class="footer-content">
                    <span>© 2026 The Care Hospital. Care • Compassion • Excellence</span>
                    <span>General Line: +604-000 0000</span>
                </div>
            </footer>
        `;
    }

    const logoutButton = q("#logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", logoutPatient);
    }

    qa("[data-protected-nav='true']").forEach(link => {
        link.addEventListener("click", event => {
            if (isLoggedIn()) return;
            event.preventDefault();
            localStorage.setItem("careReturnTo", link.href);
            location.href = root + "login.html";
        });
    });

    const startButton = q("#startAppointmentNav");
    if (startButton) {
        startButton.addEventListener("click", event => {
            if (isLoggedIn()) return;
            event.preventDefault();
            localStorage.setItem("careReturnTo", startButton.href);
            location.href = root + "login.html";
        });
    }
}

/* =========================
   LOGIN / SIGNUP
========================= */
function normalizeIC(value) {
    return String(value || "").replace(/[^0-9]/g, "");
}

function isValidIC(value) {
    return /^\d{12}$/.test(normalizeIC(value));
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function identifierKey(value) {
    return isValidIC(value)
        ? normalizeIC(value)
        : String(value || "").trim().toLowerCase();
}

function checkPasswordRules(password) {
    return {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        number: /\d/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    };
}

function isValidPassword(password) {
    const rules = checkPasswordRules(password);
    return rules.length && rules.uppercase && rules.number && rules.special;
}

function togglePassword(inputID, button) {
    const input = document.getElementById(inputID);
    if (!input) return;

    const icon = button.querySelector("i");
    const show = input.type === "password";

    input.type = show ? "text" : "password";
    if (icon) {
        icon.className = show ? "bi bi-eye-slash" : "bi bi-eye";
    }
}

function updatePasswordRule(id, passed) {
    const element = document.getElementById(id);
    if (!element) return;

    element.classList.toggle("passed", passed);

    const icon = element.querySelector("i");
    if (icon) {
        icon.className = passed ? "bi bi-check-circle-fill" : "bi bi-circle";
    }
}


function initSignup() {
    const form = q("#signupForm");
    if (!form) return;

    const passwordInput = q("#signupPassword");

    passwordInput.addEventListener("input", () => {
        const rules = checkPasswordRules(passwordInput.value);

        updatePasswordRule("ruleUpper", rules.uppercase);
        updatePasswordRule("ruleNumber", rules.number);
        updatePasswordRule("ruleSpecial", rules.special);
        updatePasswordRule("ruleLength", rules.length);
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const fullName = q("#signupName").value.trim();
        const identifier = q("#signupIdentifier").value.trim();
        const dateOfBirth = q("#signupDOB").value;
        const password = q("#signupPassword").value;
        const confirmPassword = q("#signupConfirmPassword").value;
        const terms = q("#signupTerms").checked;
        const message = q("#signupMessage");
        const submitButton = form.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        if (!fullName) {
            message.innerHTML =
                `<div class="alert alert-danger">Please enter your full name.</div>`;
            return;
        }

        if (!isValidEmail(identifier) && !isValidIC(identifier)) {
            message.innerHTML =
                `<div class="alert alert-danger">Please enter a valid email address or 12-digit IC number.</div>`;
            return;
        }

        if (!dateOfBirth) {
            message.innerHTML =
                `<div class="alert alert-danger">Please enter your date of birth.</div>`;
            return;
        }

        if (new Date(dateOfBirth + "T00:00:00") > new Date()) {
            message.innerHTML =
                `<div class="alert alert-danger">Date of birth cannot be in the future.</div>`;
            return;
        }

        if (!isValidPassword(password)) {
            message.innerHTML = `
                <div class="alert alert-danger">
                    Password must be at least 8 characters and contain
                    a capital letter, a number and a special character.
                </div>
            `;
            return;
        }

        if (password !== confirmPassword) {
            message.innerHTML =
                `<div class="alert alert-danger">Password and Confirm Password do not match.</div>`;
            return;
        }

        if (!terms) {
            message.innerHTML =
                `<div class="alert alert-danger">Please agree to the Terms & Conditions.</div>`;
            return;
        }

        const normalizedIdentifier = isValidIC(identifier)
            ? normalizeIC(identifier)
            : identifier.toLowerCase();

        if (submitButton) submitButton.disabled = true;

        message.innerHTML =
            `<div class="alert alert-info">Creating your account...</div>`;

        try {
            const response = await fetch(`${AUTH_API_URL}/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    full_name: fullName,
                    identifier: normalizedIdentifier,
                    date_of_birth: dateOfBirth,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Registration failed.");
            }

            message.innerHTML = `
                <div class="alert alert-success">
                    Account created successfully.
                    Your patient number is
                    <strong>${escapeHtml(data.patient.patient_number)}</strong>.
                    Redirecting to login...
                </div>
            `;

            // No password is saved in localStorage.
            setTimeout(() => {
                location.href = getRoot() + "login.html";
            }, 1200);
        } catch (error) {
            message.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeHtml(
                        error.message || "Unable to register. Please try again."
                    )}
                </div>
            `;
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}


function initLogin() {
    const form = q("#loginForm");

    if (form && isLoggedIn() && localStorage.getItem("careToken")) {
        const returnTo = localStorage.getItem("careReturnTo");
        localStorage.removeItem("careReturnTo");

        location.replace(
            returnTo || getRoot() + "pages/patient_dashboard.html"
        );
        return;
    }

    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const identifier = q("#loginIdentifier").value.trim();
        const password = q("#loginPassword").value;
        const message = q("#loginMessage");
        const submitButton = form.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        if (!isValidEmail(identifier) && !isValidIC(identifier)) {
            message.innerHTML = `
                <div class="alert alert-danger">
                    Please enter a valid email address or 12-digit IC number.
                </div>
            `;
            return;
        }

        if (!password) {
            message.innerHTML = `
                <div class="alert alert-danger">
                    Please enter your password.
                </div>
            `;
            return;
        }

        const normalizedIdentifier = isValidIC(identifier)
            ? normalizeIC(identifier)
            : identifier.toLowerCase();

        if (submitButton) submitButton.disabled = true;

        message.innerHTML =
            `<div class="alert alert-info">Signing in...</div>`;

        try {
            const response = await fetch(`${AUTH_API_URL}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    identifier: normalizedIdentifier,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Unable to sign in."
                );
            }

            // Store the token for authenticated API requests.
            localStorage.setItem("careToken", data.token);

            // Preserve the user structure used by existing pages.
            setUser({
                id: data.patient.id,
                patientNumber: data.patient.patient_number,
                name: data.patient.full_name,
                identifier: normalizedIdentifier,
                identifierType: isValidIC(normalizedIdentifier)
                    ? "IC"
                    : "Email",
                dateOfBirth: data.patient.date_of_birth
                    ? String(data.patient.date_of_birth).slice(0, 10)
                    : ""
            });

            const returnTo = localStorage.getItem("careReturnTo");
            localStorage.removeItem("careReturnTo");

            location.href =
                returnTo || getRoot() + "pages/patient_dashboard.html";
        } catch (error) {
            message.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeHtml(
                        error.message ||
                        "Unable to sign in. Please try again."
                    )}
                </div>
            `;
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}


/* =========================
   HOME
========================= */
function initHome() {
    const searchButton = q("#homeDoctorSearch");
    if (!searchButton) return;

    searchButton.addEventListener("click", () => {
        const specialty = q("#homeSpecialty").value;
        const name = q("#homeDoctorName").value.trim();

        location.href =
            "pages/doctors.html?specialty=" +
            encodeURIComponent(specialty) +
            "&name=" +
            encodeURIComponent(name);
    });
}

/* =========================
   DOCTORS
========================= */
function initDoctors() {
    const grid = q("#doctorGrid");
    if (!grid) return;

    const specialty = q("#doctorSpecialty");
    const nameInput = q("#doctorNameSearch");
    const count = q("#doctorCount");
    const noResults = q("#doctorNoResults");

    [...new Set(DOCTORS.map(doctor => doctor.specialty))]
        .forEach(value => {
            specialty.insertAdjacentHTML("beforeend", `<option>${value}</option>`);
        });

    function render() {
        const selected = specialty.value;
        const name = nameInput.value.toLowerCase().trim();

        const list = DOCTORS.filter(doctor =>
            (!selected || doctor.specialty === selected) &&
            (!name || doctor.name.toLowerCase().includes(name))
        );

        grid.innerHTML = list.map(doctor => `
            <article class="card doctor-card">
                <div class="doctor-avatar">${doctor.initials}</div>

                <div class="doctor-info">
                    <span class="status-badge status-info">${doctor.specialty}</span>
                    <h3>${doctor.name}</h3>
                    <p class="body-text">${doctor.position}</p>
                    <p class="muted-text">
                        <i class="bi bi-translate"></i>
                        ${doctor.languages}
                    </p>

                    <div class="doctor-actions">
                        <a class="btn btn-outline" href="doctor_profile.html?doctor=${doctor.id}">
                            View Profile
                        </a>

                        <a class="btn btn-primary" href="appointment.html?doctor=${doctor.id}">
                            Start Appointment
                        </a>
                    </div>
                </div>
            </article>
        `).join("");

        count.textContent = `Showing ${list.length} doctor${list.length === 1 ? "" : "s"}`;
        noResults.classList.toggle("hidden", list.length > 0);
    }

    const params = new URLSearchParams(location.search);
    specialty.value = params.get("specialty") || "";
    nameInput.value = params.get("name") || "";

    q("#doctorSearchButton").addEventListener("click", render);
    q("#doctorShowAll").addEventListener("click", () => {
        specialty.value = "";
        nameInput.value = "";
        render();
    });

    nameInput.addEventListener("keydown", event => {
        if (event.key === "Enter") render();
    });

    render();
}

/* =========================
   DOCTOR PROFILE
========================= */
function initDoctorProfile() {
    const name = q("#profileDoctorName");
    if (!name) return;

    const doctor = doctorById(new URLSearchParams(location.search).get("doctor"));

    if (!doctor) {
        location.href = "doctors.html";
        return;
    }

    document.title = doctor.name + " | The Care Hospital";

    q("#profileInitials").textContent = doctor.initials;
    q("#profileSpecialty").textContent = doctor.specialty;
    q("#profileDoctorName").textContent = doctor.name;
    q("#profilePosition").textContent = doctor.position;
    q("#profileExperience").textContent = doctor.experience;
    q("#profileLanguages").textContent = doctor.languages;
    q("#profileQualifications").textContent = doctor.qualifications;
    q("#profileAbout").textContent = doctor.about;
    q("#profileBook").href = "appointment.html?doctor=" + doctor.id;

    q("#profileInterests").innerHTML =
        doctor.interests.map(item => `<span class="chip">${item}</span>`).join("");

    q("#profileSchedule").innerHTML =
        Object.entries(doctor.schedule).map(([day, times]) => `
            <div class="schedule-row">
                <strong>${day}</strong>
                <span class="status-badge status-info">
                    ${times[0]} – ${times[times.length - 1]}
                </span>
            </div>
        `).join("");
}

/* =========================
   DEPARTMENT ROUTING
========================= */
function initDepartment() {
    const result = q("#routingResult");
    if (!result) return;

    q("#departmentCards").innerHTML = ROUTES.map(route => `
        <div class="card card-pad">
            <span class="icon-box"><i class="bi bi-hospital"></i></span>
            <h3 class="section-title" style="margin-top:12px">${route.department}</h3>
            <p class="muted-text">${route.keywords.slice(0, 4).join(" • ")}</p>
            <a class="btn btn-outline" href="doctors.html?specialty=${encodeURIComponent(route.department)}">
                View Doctors
            </a>
        </div>
    `).join("");

    q("#routeButton").addEventListener("click", () => {
        const text = q("#symptomInput").value.toLowerCase().trim();

        if (!text) {
            result.innerHTML = `<div class="alert alert-danger">Please enter at least one symptom or service need.</div>`;
            return;
        }

        let best = null;
        let score = 0;

        ROUTES.forEach(route => {
            const currentScore = route.keywords.reduce(
                (total, keyword) => total + (text.includes(keyword) ? 1 : 0),
                0
            );

            if (currentScore > score) {
                score = currentScore;
                best = route;
            }
        });

        if (!best) {
            best = ROUTES.find(route => route.department === "General Medicine");
        }

        result.innerHTML = `
            <span class="status-badge status-info">RECOMMENDED</span>
            <h2 class="page-title" style="margin-top:12px">${best.department}</h2>

            <p class="body-text">
                Based on the keywords entered, this is the closest matching department in this prototype.
                This routing does not provide a medical diagnosis.
            </p>

            <div class="doctor-actions">
                <a class="btn btn-primary" href="doctors.html?specialty=${encodeURIComponent(best.department)}">
                    View ${best.department} Doctors
                </a>

                <a class="btn btn-outline" href="appointment.html?specialty=${encodeURIComponent(best.department)}">
                    Book Appointment
                </a>
            </div>
        `;
    });
}


/* =========================
   APPOINTMENT BOOKING - DATABASE VERSION
========================= */

function initAppointment() {
    const form = q("#appointmentForm");
    if (!form) return;
    if (!requireLogin()) return;

    const specialty = q("#appointmentSpecialty");
    const doctor = q("#appointmentDoctor");
    const dateInput = q("#appointmentDate");
    const timeInput = q("#appointmentTime");
    const slots = q("#appointmentSlots");
    const notes = q("#appointmentNotes");
    const summary = q("#appointmentSummary");

    const params = new URLSearchParams(location.search);
    const editId = params.get("edit");

    let editing = null;
    let departments = [];
    let appointments = [];

    const specialties = [...new Set(DOCTORS.map(item => item.specialty))];

    specialty.innerHTML =
        `<option value="">Select specialty</option>` +
        specialties.map(item =>
            `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`
        ).join("");

    dateInput.min = localToday();

    function getDepartmentForSpecialty(value) {
        return departments.find(department =>
            String(department.department_name).trim().toLowerCase() ===
            String(value).trim().toLowerCase()
        );
    }

    function fillDoctors(selected = "") {
        const list = DOCTORS.filter(item =>
            !specialty.value || item.specialty === specialty.value
        );

        doctor.innerHTML =
            `<option value="">Select doctor</option>` +
            list.map(item =>
                `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`
            ).join("");

        if (selected) {
            doctor.value = selected;
        }
    }

    function weekday(date) {
        return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
            weekday: "long"
        });
    }

    function updateSummary() {
        const selectedDoctor = doctorById(doctor.value);

        summary.innerHTML = selectedDoctor
            ? `
                <p>
                    <strong>${escapeHtml(selectedDoctor.name)}</strong><br>
                    ${escapeHtml(selectedDoctor.specialty)}
                </p>
                <p>
                    <i class="bi bi-calendar"></i>
                    ${dateInput.value ? formatDate(dateInput.value) : "Select date"}
                    <br>
                    <i class="bi bi-clock"></i>
                    ${timeInput.value || "Select time"}
                </p>
            `
            : "Select your appointment details to see a summary.";
    }

    async function renderSlots(selectedTime = "") {
        const selectedDoctor = doctorById(doctor.value);

        if (!selectedDoctor || !dateInput.value) {
            slots.innerHTML =
                `<span class="muted-text">Choose a doctor and date.</span>`;
            return;
        }

        const available =
            selectedDoctor.schedule?.[weekday(dateInput.value)] || [];

        if (!available.length) {
            slots.innerHTML =
                `<span class="muted-text">Doctor has no consultation session on this day.</span>`;
            timeInput.value = "";
            updateSummary();
            return;
        }

        try {
            appointments = await fetchPatientAppointments();
        } catch (error) {
            slots.innerHTML =
                `<span class="muted-text">${escapeHtml(error.message)}</span>`;
            return;
        }

        slots.innerHTML = available.map(time => {
            const taken = appointments.some(appointment =>
                appointment.id !== String(editId || "") &&
                appointment.doctorId === selectedDoctor.id &&
                appointment.date === dateInput.value &&
                appointment.time === time &&
                !["Cancelled", "Completed", "No Show"].includes(appointment.status)
            );

            let timePassed = false;

            if (dateInput.value === localToday()) {
                const [hours, minutes] = time.split(":").map(Number);
                const slotTime = new Date();
                slotTime.setHours(hours, minutes, 0, 0);

                const cutoff = new Date();
                cutoff.setMinutes(cutoff.getMinutes() + 15);

                timePassed = slotTime <= cutoff;
            }

            const unavailable = taken || timePassed;

            return `
                <button
                    type="button"
                    class="slot-btn ${selectedTime === time && !unavailable ? "selected" : ""}"
                    data-time="${escapeHtml(time)}"
                    ${unavailable ? "disabled" : ""}
                >
                    ${escapeHtml(time)}${timePassed ? " (Passed)" : ""}
                </button>
            `;
        }).join("");

        qa(".slot-btn:not(:disabled)").forEach(button => {
            button.addEventListener("click", () => {
                qa(".slot-btn").forEach(item =>
                    item.classList.remove("selected")
                );

                button.classList.add("selected");
                timeInput.value = button.dataset.time;
                updateSummary();
            });
        });

        if (
            dateInput.value === localToday() &&
            qa(".slot-btn:not(:disabled)").length === 0
        ) {
            slots.insertAdjacentHTML(
                "beforeend",
                `<p class="muted-text" style="grid-column:1/-1;margin:8px 0 0;">
                    No remaining appointment slots are available for today.
                </p>`
            );
        }
    }

    specialty.addEventListener("change", () => {
        fillDoctors();
        timeInput.value = "";
        renderSlots();
        updateSummary();
    });

    doctor.addEventListener("change", () => {
        timeInput.value = "";
        renderSlots();
        updateSummary();
    });

    dateInput.addEventListener("change", () => {
        timeInput.value = "";
        renderSlots();
        updateSummary();
    });

    async function initializeForm() {
        try {
            const departmentData = await patientApiRequest("/departments");
            departments = departmentData.departments || [];

            if (editId) {
                appointments = await fetchPatientAppointments();

                editing = appointments.find(item =>
                    item.id === String(editId)
                );

                if (!editing) {
                    alert("Appointment not found.");
                    location.href = "appointment_history.html";
                    return;
                }

                q("#appointmentPageTitle").textContent =
                    "Reschedule Appointment";

                q("#appointmentSubmitText").textContent =
                    "Save New Schedule";

                specialty.value = editing.specialty;
                fillDoctors(editing.doctorId);

                dateInput.value = editing.date;
                timeInput.value = editing.time;

                if (notes) notes.value = editing.notes || "";

                await renderSlots(editing.time);
                updateSummary();
                return;
            }

            const doctorId = params.get("doctor");
            const requestedSpecialty = params.get("specialty");

            if (doctorId) {
                const selectedDoctor = doctorById(doctorId);

                if (selectedDoctor) {
                    specialty.value = selectedDoctor.specialty;
                    fillDoctors(doctorId);
                } else {
                    fillDoctors();
                }
            } else if (requestedSpecialty) {
                specialty.value = requestedSpecialty;
                fillDoctors();
            } else {
                fillDoctors();
            }

            updateSummary();
        } catch (error) {
            alert(`Unable to load appointment details: ${error.message}`);
        }
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (!doctor.value || !dateInput.value || !timeInput.value) {
            alert("Please choose a doctor, date and available time.");
            return;
        }

        const selectedDoctor = doctorById(doctor.value);

        if (!selectedDoctor) {
            alert("Please select a valid doctor.");
            return;
        }

        const department = getDepartmentForSpecialty(
            selectedDoctor.specialty
        );

        if (!department) {
            alert(
                `No active hospital department matches "${selectedDoctor.specialty}". ` +
                "Please check the department names in PostgreSQL."
            );
            return;
        }

        const scheduledAt = getLocalAppointmentDateTime(
            dateInput.value,
            timeInput.value
        );

        if (new Date(scheduledAt) <= new Date()) {
            alert("Please choose a future appointment time.");
            return;
        }

        const submitButton = form.querySelector('[type="submit"]');

        if (submitButton) submitButton.disabled = true;

        try {
            if (editing) {
                await patientApiRequest(
                    `/appointments/${encodeURIComponent(editing.id)}/reschedule`,
                    {
                        method: "PUT",
                        body: JSON.stringify({
                            scheduled_at: scheduledAt,
                            notes: notes?.value.trim() || ""
                        })
                    }
                );

                alert("Appointment rescheduled successfully.");
            } else {
              await patientApiRequest("/appointments", {
                method: "POST",
                body: JSON.stringify({
                    department_id: Number(department.id),
                    doctor_id: selectedDoctor.id,
                    scheduled_at: scheduledAt,
                    notes: document.getElementById("appointmentNotes")?.value.trim() || ""
                })
            });

                alert("Appointment booked successfully.");
            }

            location.href = "appointment_history.html";
        } catch (error) {
            alert(`Unable to save appointment: ${error.message}`);
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });

    initializeForm();
}


/* =========================
   APPOINTMENT HISTORY / QMS
========================= */
function queuePrefix(specialty) {
    const prefixes = {
        Cardiology: "CAR",
        Neurology: "NEU",
        Orthopaedics: "ORT",
        Paediatrics: "PED",
        Dermatology: "DER",
        "General Medicine": "GEN"
    };

    return prefixes[specialty] || "GEN";
}

function generateQueueNumber(appointment, queue) {
    const prefix = queuePrefix(appointment.specialty);

    const sameGroup = queue.filter(item =>
        item.appointmentDate === appointment.date &&
        item.specialty === appointment.specialty
    );

    const next = sameGroup.reduce((highest, item) => {
        const match = String(item.queueNumber || "").match(/(\d+)$/);
        return Math.max(highest, match ? Number(match[1]) : 0);
    }, 0) + 1;

    return `${prefix}-${String(next).padStart(3, "0")}`;
}


/* =========================
   APPOINTMENT HISTORY - DATABASE VERSION
========================= */

function initHistory() {
    const listContainer = q("#appointmentList");
    if (!listContainer) return;
    if (!requireLogin()) return;

    const emptyState = q("#appointmentEmpty");
    const filter = q("#appointmentFilter");

    let appointments = [];

    function render() {
        const selectedFilter = filter.value;

        const list = appointments
            .filter(appointment =>
                selectedFilter === "All" ||
                appointment.status === selectedFilter
            )
            .sort((a, b) =>
                `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)
            );

        emptyState.classList.toggle("hidden", list.length > 0);

        listContainer.innerHTML = list.map(appointment => {
            const selectedDoctor = doctorById(appointment.doctorId);
            const doctorName = appointment.doctorName || "Doctor to be assigned";

            const canManage = ["Confirmed"].includes(appointment.status);

            
            const actions = canManage
                ? `
                    <button
                        class="btn btn-primary"
                        type="button"
                        data-register="${escapeHtml(appointment.id)}"
                    >
                        <i class="bi bi-person-check"></i>
                        Register
                    </button>

                    <a
                        class="btn btn-outline"
                        href="appointment.html?edit=${encodeURIComponent(appointment.id)}"
                    >
                        <i class="bi bi-calendar-event"></i>
                        Reschedule
                    </a>

                    <button
                        class="btn btn-danger"
                        type="button"
                        data-cancel="${escapeHtml(appointment.id)}"
                    >
                        <i class="bi bi-x-circle"></i>
                        Cancel
                    </button>
                `
                : `<span class="muted-text">No actions available</span>`;


            return `
                <article class="card appointment-detail-card">
                    <div class="appointment-card-header">
                        <div>
                            <div class="appointment-reference">
                                <i class="bi bi-receipt"></i>
                                Appointment ${escapeHtml(appointment.id)}
                            </div>

                            <h2>${escapeHtml(doctorName)}</h2>
                            <p>${escapeHtml(
                                selectedDoctor?.position || appointment.specialty || "Hospital appointment"
                            )}</p>
                        </div>

                        <span class="status-badge ${statusClass(appointment.status)}">
                            ${escapeHtml(appointment.status)}
                        </span>
                    </div>

                    <div class="appointment-detail-grid">
                        <div class="appointment-detail-item">
                            <i class="bi bi-hospital"></i>
                            <div>
                                <span>Department / Specialty</span>
                                <strong>${escapeHtml(appointment.specialty || "—")}</strong>
                            </div>
                        </div>

                        <div class="appointment-detail-item">
                            <i class="bi bi-calendar3"></i>
                            <div>
                                <span>Appointment Date</span>
                                <strong>${escapeHtml(formatDate(appointment.date))}</strong>
                            </div>
                        </div>

                        <div class="appointment-detail-item">
                            <i class="bi bi-clock"></i>
                            <div>
                                <span>Appointment Time</span>
                                <strong>${escapeHtml(appointment.time)}</strong>
                            </div>
                        </div>

                        <div class="appointment-detail-item">
                            <i class="bi bi-person-badge"></i>
                            <div>
                                <span>Doctor</span>
                                <strong>${escapeHtml(doctorName)}</strong>
                            </div>
                        </div>
                    </div>

                    <div class="appointment-notes">
                        <span>Reason / Notes</span>
                        <p>${escapeHtml(appointment.notes || "No notes provided.")}</p>
                    </div>

                    <div class="appointment-card-footer">
                        <div class="appointment-booked-date">
                            <i class="bi bi-info-circle"></i>
                            <span>
                                ${
                                    appointment.createdAt
                                        ? `Booked ${new Date(appointment.createdAt).toLocaleString("en-MY")}`
                                        : "Appointment booking"
                                }
                            </span>
                        </div>

                        <div class="appointment-actions">
                            ${actions}
                        </div>
                    </div>
                </article>
            `;
        }).join("");

        
        /* =========================
        REGISTER APPOINTMENT WITH QMS
        ========================= */

        qa("[data-register]").forEach(button => {

            button.addEventListener("click", async () => {

                // Keep PostgreSQL BIGINT appointment ID as a string.
                const appointmentId = button.dataset.register;

                if (!appointmentId) {
                    alert("Invalid appointment ID.");
                    return;
                }

                if (!confirm(
                    "Register for this appointment and receive your queue number?"
                )) {
                    return;
                }

                button.disabled = true;

                const originalText = button.innerHTML;

                button.innerHTML = `
                    <span class="spinner-border spinner-border-sm"></span>
                    Registering...
                `;

                try {

                    // Send the patient's JWT directly to QMS port 3000.
                    const data = await qmsPatientRequest(
                        "/appointment-queues/patient-register",
                        {
                            method: "POST",

                            body: JSON.stringify({
                                appointment_id: appointmentId
                            })
                        }
                    );

                    // Support the expected QMS response structure.
                    const queueNumber =
                        data.queue?.queue_number ||
                        data.queue?.queueNumber ||
                        data.queueNumber ||
                        data.queue_number;

                    if (queueNumber) {

                        alert(
                            `Registration successful!\n\n` +
                            `Your queue number is: ${queueNumber}`
                        );

                    } else {

                        alert(
                            data.message ||
                            "Appointment queue registration successful!"
                        );

                    }

                    // Reload appointment records from patient backend.
                    // The QMS registration endpoint should have updated
                    // the appointment status to CHECKED_IN.
                    await loadAppointments();

                } catch (error) {

                    alert(
                        `Unable to register appointment:\n\n${error.message}`
                    );

                    button.disabled = false;
                    button.innerHTML = originalText;

                }

            });

        });


        qa("[data-cancel]").forEach(button => {
            button.addEventListener("click", async () => {
                if (!confirm("Cancel this appointment?")) return;

                button.disabled = true;

                try {
                    await patientApiRequest(
                        `/appointments/${encodeURIComponent(button.dataset.cancel)}/cancel`,
                        { method: "PATCH" }
                    );

                    alert("Appointment cancelled successfully.");
                    await loadAppointments();
                } catch (error) {
                    alert(`Unable to cancel appointment: ${error.message}`);
                    button.disabled = false;
                }
            });
        });
    }

    async function loadAppointments() {
        listContainer.innerHTML =
            `<p class="muted-text">Loading your appointments...</p>`;

        try {
            appointments = await fetchPatientAppointments();
            render();
        } catch (error) {
            listContainer.innerHTML = `
                <p class="muted-text">
                    Unable to load appointments: ${escapeHtml(error.message)}
                </p>
            `;
            emptyState.classList.add("hidden");
        }
    }

    filter.addEventListener("change", render);

    loadAppointments();
}

/* =========================
   DASHBOARD
========================= */

async function initDashboard() {
    const welcome = q("#dashboardWelcome");
    if (!welcome) return;
    if (!requireLogin()) return;

    const user = getUser();

    welcome.textContent = "Welcome, " + (user.name || "Patient");

    const upcomingElement = q("#dashboardUpcoming");
    const registeredElement = q("#dashboardRegistered");
    const cancelledElement = q("#dashboardCancelled");
    const nextElement = q("#dashboardNext");

    try {
        // Load actual appointments from PostgreSQL.
        const appointments = await fetchPatientAppointments();

        const upcoming = appointments.filter(item =>
            item.status === "Confirmed" &&
            item.date >= localToday()
        );

        const registered = appointments.filter(item =>
            item.status === "Checked In"
        );

        const cancelled = appointments.filter(item =>
            item.status === "Cancelled"
        );

        upcomingElement.textContent = upcoming.length;
        registeredElement.textContent = registered.length;
        cancelledElement.textContent = cancelled.length;

        const next = upcoming.sort((a, b) =>
            `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)
        )[0];

        nextElement.innerHTML = next
            ? `
                <strong>${escapeHtml(next.doctorName)}</strong><br>
                ${escapeHtml(next.specialty)}<br>
                ${escapeHtml(formatDate(next.date))}
                at ${escapeHtml(next.time)}
            `
            : "No upcoming appointment.";

    } catch (error) {
        console.error("Unable to load dashboard appointments:", error);

        upcomingElement.textContent = "—";
        registeredElement.textContent = "—";
        cancelledElement.textContent = "—";

        nextElement.textContent =
            "Unable to load appointments. Please refresh the page.";
    }
}


/* =========================
   PATIENT PROFILE
========================= */
function initPatientProfile() {
    const name = q("#patientProfileName");
    if (!name) return;
    if (!requireLogin()) return;

    const user = getUser();

    name.textContent = user.name;
    q("#patientProfileId").textContent = user.id || "—";
    q("#patientProfileIdentifier").textContent = user.identifier || "—";
    q("#patientProfileIdentifierType").textContent = user.identifierType || "—";
    q("#patientProfileDOB").textContent = user.dateOfBirth
        ? formatDate(user.dateOfBirth)
        : "—";
}


/* =========================
   NOTIFICATIONS - DATABASE VERSION
========================= */

async function initNotifications() {

    const button = document.getElementById("notificationButton");
    const dropdown = document.getElementById("notificationDropdown");
    const list = document.getElementById("notificationList");
    const badge = document.getElementById("notificationBadge");
    const markReadButton = document.getElementById("markNotificationsRead");

    if (!button || !dropdown || !list || !badge) {
        return;
    }

    const user = getUser();

    if (!user) {
        return;
    }

    let notifications = [];

    /* Get read notification IDs */

    function getReadNotifications() {
        try {
            return JSON.parse(
                localStorage.getItem("careReadNotifications") || "[]"
            );
        } catch {
            return [];
        }
    }

    /* Generate appointment notifications */

    try {

        // Retrieve actual appointments from PostgreSQL.
        const appointments = await fetchPatientAppointments();

        const today = new Date(`${localToday()}T00:00:00`);

        appointments
            .filter(appointment =>
                appointment.status === "Confirmed"
            )
            .forEach(appointment => {

                const appointmentDate = new Date(
                    `${appointment.date}T00:00:00`
                );

                const differenceInMilliseconds =
                    appointmentDate.getTime() - today.getTime();

                const daysBeforeAppointment = Math.round(
                    differenceInMilliseconds /
                    (1000 * 60 * 60 * 24)
                );

                const doctorName =
                    appointment.doctorName || "Your doctor";

                const appointmentDetail =
                    `${formatDate(appointment.date)} • ${appointment.time}`;

                /* Appointment confirmed */

                notifications.push({

                    id: `confirmed-${appointment.id}`,

                    icon: "bi-check-circle",

                    title: "Appointment Confirmed",

                    message: doctorName,

                    detail: appointmentDetail

                });

                /* Seven-day reminder */

                if (daysBeforeAppointment === 7) {

                    notifications.push({

                        id: `7day-${appointment.id}`,

                        icon: "bi-calendar-week",

                        title: "Appointment in 1 Week",

                        message: doctorName,

                        detail: appointmentDetail

                    });

                }

                /* One-day reminder */

                if (daysBeforeAppointment === 1) {

                    notifications.push({

                        id: `1day-${appointment.id}`,

                        icon: "bi-alarm",

                        title: "Appointment Tomorrow",

                        message: doctorName,

                        detail: appointmentDetail

                    });

                }

            });

    } catch (error) {

        console.error(
            "Unable to load appointment notifications:",
            error
        );

        badge.classList.add("hidden");

        list.innerHTML = `
            <div class="notification-empty">
                <i class="bi bi-exclamation-circle"></i>
                <p>
                    Unable to load notifications.
                    Please refresh the page.
                </p>
            </div>
        `;

        return;
    }

    /* Display notifications */

    function renderNotifications() {

        const readNotifications = getReadNotifications();

        const unread = notifications.filter(notification =>
            !readNotifications.includes(notification.id)
        );

        /* Update notification badge */

        if (unread.length > 0) {

            badge.textContent = unread.length;

            badge.classList.remove("hidden");

        } else {

            badge.classList.add("hidden");

        }

        /* Empty notification state */

        if (notifications.length === 0) {

            list.innerHTML = `
                <div class="notification-empty">

                    <i class="bi bi-bell"></i>

                    <p>No notifications yet.</p>

                </div>
            `;

            return;
        }

        /* Notification list */

        list.innerHTML = notifications.map(notification => {

            const isRead = readNotifications.includes(
                notification.id
            );

            return `
                <div class="
                    notification-item
                    ${isRead ? "" : "unread"}
                ">

                    <div class="notification-icon">

                        <i class="
                            bi
                            ${escapeHtml(notification.icon)}
                        "></i>

                    </div>

                    <div class="notification-content">

                        <strong>
                            ${escapeHtml(notification.title)}
                        </strong>

                        <p>
                            ${escapeHtml(notification.message)}
                        </p>

                        <span>
                            ${escapeHtml(notification.detail)}
                        </span>

                    </div>

                </div>
            `;

        }).join("");

    }

    renderNotifications();

    /* Open / close notification dropdown */

    button.addEventListener("click", function(event) {

        event.stopPropagation();

        dropdown.classList.toggle("hidden");

    });

    /* Click outside closes dropdown */

    document.addEventListener("click", function(event) {

        if (
            !dropdown.contains(event.target) &&
            !button.contains(event.target)
        ) {

            dropdown.classList.add("hidden");

        }

    });

    /* Mark everything as read */

    if (markReadButton) {

        markReadButton.addEventListener("click", function() {

            const ids = notifications.map(notification =>
                notification.id
            );

            localStorage.setItem(
                "careReadNotifications",
                JSON.stringify(ids)
            );

            renderNotifications();

        });

    }

}


/* =========================
   INITIALISE
========================= */
document.addEventListener("DOMContentLoaded", () => {
    renderShell();
    initNotifications();
    initHome();
    initSignup();
    initLogin();
    initDoctors();
    initDoctorProfile();
    initDepartment();
    initAppointment();
    initHistory();
    initDashboard();
    initPatientProfile();
});
