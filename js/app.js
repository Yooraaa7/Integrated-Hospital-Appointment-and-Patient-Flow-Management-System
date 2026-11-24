function getDoctorExpertise(doctorId, department) {
    const expertise = {
        "DOC-GM-001": [
            "General Health Checkups",
            "Preventive Healthcare",
            "Chronic Disease Management"
        ],
        "DOC-GM-002": [
            "Diabetes Management",
            "Hypertension",
            "General Internal Medicine"
        ],
        "DOC-GM-003": [
            "Infectious Diseases",
            "Respiratory Conditions",
            "Primary Healthcare"
        ],

        "DOC-CD-001": [
            "Heart Failure",
            "Coronary Artery Disease",
            "Cardiac Risk Assessment"
        ],
        "DOC-CD-002": [
            "Cardiac Arrhythmia",
            "Electrocardiography",
            "Hypertension"
        ],
        "DOC-CD-003": [
            "Preventive Cardiology",
            "Cholesterol Management",
            "Heart Disease"
        ],

        "DOC-OR-001": [
            "Joint Replacement",
            "Knee Surgery",
            "Hip Conditions"
        ],
        "DOC-OR-002": [
            "Sports Injuries",
            "Fracture Management",
            "Arthroscopy"
        ],
        "DOC-OR-003": [
            "Spinal Conditions",
            "Back Pain",
            "Musculoskeletal Disorders"
        ],

        "DOC-DR-001": [
            "Acne Treatment",
            "Eczema",
            "General Skin Conditions"
        ],
        "DOC-DR-002": [
            "Skin Cancer Screening",
            "Mole Assessment",
            "Pigmentation Disorders"
        ],
        "DOC-DR-003": [
            "Psoriasis",
            "Allergic Skin Conditions",
            "Dermatological Procedures"
        ],

        "DOC-PD-001": [
            "Child Health Checkups",
            "Childhood Immunisation",
            "Growth and Development"
        ],
        "DOC-PD-002": [
            "Neonatal Care",
            "Newborn Health",
            "Infant Development"
        ],
        "DOC-PD-003": [
            "Childhood Infections",
            "Paediatric Respiratory Conditions",
            "General Paediatrics"
        ],
        "DOC-CD-004": [
            "Neonatal Medicine",
            "Premature Infant Care",
            "Newborn Health"
        ],

        "DOC-OP-001": [
            "Cataract Assessment",
            "Eye Surgery",
            "General Eye Conditions"
        ],
        "DOC-OP-002": [
            "Retinal Disorders",
            "Diabetic Eye Disease",
            "Vision Assessment"
        ],
        "DOC-OP-003": [
            "Glaucoma",
            "Eye Pressure Management",
            "Comprehensive Eye Examinations"
        ]
    };

    return expertise[doctorId] || [
        `${department} Consultation`,
        "Diagnosis and Assessment",
        "Treatment and Follow-up"
    ];
}

// Hospital data is loaded dynamically from PostgreSQL.
let DOCTORS = [];
let DEPARTMENTS = [];
let ROUTES = [];

const ROUTING_KEYWORDS = {
    "General Medicine": [
        "fever", "cough", "flu", "tired", "fatigue",
        "checkup", "general", "screening"
    ],
    "Cardiology": [
        "chest pain", "heart", "palpitation",
        "shortness of breath", "high blood pressure",
        "hypertension"
    ],
    "Orthopaedics": [
        "joint pain", "back pain", "bone", "fracture",
        "knee", "shoulder", "sports injury"
    ],
    "Dermatology": [
        "skin", "rash", "acne", "eczema", "itch", "mole"
    ],
    "Paediatrics": [
        "child", "children", "baby", "infant",
        "fever child", "growth"
    ],
    "Ophthalmology": [
        "eye", "eyes", "vision", "blurred vision",
        "cataract", "retina"
    ]
};

const WEEKDAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];

function generateScheduleSlots(schedule) {
    const slots = {};

    (schedule || []).forEach(day => {
        const dayName = WEEKDAYS[day.day_of_week % 7];

        if (!day.is_working) {
            slots[dayName] = [];
            return;
        }

        const times = [];

        function addSession(start, end) {
            if (!start || !end) return;

            const [startHour, startMinute] =
                start.split(":").map(Number);

            const [endHour, endMinute] =
                end.split(":").map(Number);

            let current = startHour * 60 + startMinute;
            const finish = endHour * 60 + endMinute;

            while (current + day.slot_minutes <= finish) {
                const hours = Math.floor(current / 60);
                const minutes = current % 60;

                times.push(
                    String(hours).padStart(2, "0") +
                    ":" +
                    String(minutes).padStart(2, "0")
                );

                current += day.slot_minutes;
            }
        }

        addSession(day.morning_start, day.morning_end);
        addSession(day.afternoon_start, day.afternoon_end);

        slots[dayName] = times;
    });

    return slots;
}

async function loadHospitalData() {
    const [departmentData, doctorData] = await Promise.all([
        patientApiRequest("/departments"),
        patientApiRequest("/doctors")
    ]);

    DEPARTMENTS = departmentData.departments || [];

    DOCTORS = (doctorData.doctors || []).map(item => ({
        id: String(item.doctor_id),
        name: item.full_name,
        initials: item.full_name
            .replace(/^Dr\.?\s*/i, "")
            .split(/\s+/)
            .map(part => part[0])
            .join("")
            .toUpperCase(),
        departmentId: String(item.department_id),
        departmentCode: item.department_code,
        department: item.department_name,
        specialty: item.specialty || item.department_name,
        position: item.specialty || "Medical Doctor",
        languages: item.languages || "Not specified",
        qualifications: item.qualifications || "Not specified",
        experience: item.years_of_experience
            ? `${item.years_of_experience} Years`
            : "Not specified",
        about: item.bio || `${item.full_name} provides consultation in ${item.specialty || item.department_name}.`,
        interests: getDoctorExpertise(item.doctor_id, item.department_name),
        photoUrl: item.photo_url || "",
        consultationRoom: item.consultation_room || "",
        schedule: generateScheduleSlots(item.schedules)
    }));

    ROUTES = DEPARTMENTS.map(department => ({
        department: department.department_name,
        departmentId: String(department.id),
        keywords: ROUTING_KEYWORDS[department.department_name] || []
    }));

    console.log("Hospital departments loaded:", DEPARTMENTS.length);
    console.log("Hospital doctors loaded:", DOCTORS.length);
}

const q = selector => document.querySelector(selector);
const qa = selector => [...document.querySelectorAll(selector)];

const AUTH_API_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3001/api/auth"
        : "https://thecare-patient-backend-api.onrender.com/api/auth";

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
        RESCHEDULED: "Rescheduled",
        CANCELLED: "Cancelled",
        COMPLETED: "Completed",
        CHECKED_IN: "Checked In",
        NO_SHOW: "No Show"
    };
    const selectedDoctor = doctorById(String(row.doctor_id || ""));

    return {
        id: String(row.id),

        // Patient-facing appointment number (separate from database ID).
        patientAppointmentNumber: String(row.patient_appointment_number),

        patientId: String(row.patient_id),
        doctorId: String(row.doctor_id || ""),
        doctorName: row.doctor_name ||
            selectedDoctor?.name ||
            (row.doctor_id ? `Doctor ${row.doctor_id}` : "Doctor to be assigned"),
        specialty: selectedDoctor?.specialty || row.department_name || "",
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

    const appointments = (data.appointments || []).map(appointmentFromApi);

    // Retrieve registered appointment queues from QMS.
    let queues = [];

    try {
        const queueData = await qmsPatientRequest(
            "/appointment-queues/my-queues"
        );

        queues = queueData.queues || [];
    } catch (error) {
        console.error(
            "Unable to load appointment queue history:",
            error
        );
    }

    // Match each QMS queue to its original appointment.
    return appointments.map(appointment => {
        const queue = queues.find(item =>
            String(item.appointment_id) === String(appointment.id)
        );

        return {
            ...appointment,
            queueNumber: queue?.queue_number || null,
            queueStatus: queue?.status || null,
            registeredAt: queue?.issued_at || null
        };
    });
}

function getLocalAppointmentDateTime(date, time) {
    return new Date(`${date}T${time}:00`).toISOString();
}

function doctorById(id) {
    return DOCTORS.find(doctor => doctor.id === id);
}



function formatDate(value) {
    if (!value) return "—";

    // Handle PostgreSQL DATE values without timezone conversion.
    const dateString = String(value).slice(0, 10);

    const parts = dateString.split("-");

    if (parts.length !== 3) return "—";

    const [year, month, day] = parts;

    const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
    );

    return date.toLocaleDateString("en-GB", {
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
    const isLoginPage = active === "login";
    const user = getUser();

    function navLink(key, label, path, loginRequired = false) {
        const extra = loginRequired ? ' data-protected-nav="true"' : "";
        return `<a href="${root}${path}" class="${active === key ? "active" : ""}"${extra}>${label}</a>`;
    }

    nav.innerHTML = isLoginPage ? "" : `
        <header class="top-navbar">
            <div class="navbar-content">

                <a
                    class="navbar-logo"
                    href="${root}${user ? "pages/patient_dashboard.html" : "index.html"}"
                >
                    <img src="${root}assets/logo.png" alt="The Care Hospital">
                </a>

                <nav class="navbar-links">
                    ${navLink("home", "Home", user ? "pages/patient_dashboard.html" : "index.html")}
                    ${navLink("doctors", "Find a Doctor", "pages/doctors.html")}
                    ${navLink("department", "Department Routing", "pages/department.html")}
                    ${navLink("appointments", "My Appointments", "pages/appointment_history.html", true)}
                </nav>

                <div class="nav-user">
                    ${
                        user
                            ? `
                                <div class="notification-wrapper">
                                    <button class="notification-button" type="button" id="notificationButton" title="Notifications">
                                        <i class="bi bi-bell"></i>
                                        <span class="notification-badge hidden" id="notificationBadge">0</span>
                                    </button>

                                    <div class="notification-dropdown hidden" id="notificationDropdown">
                                        <div class="notification-header">
                                            <strong>Notifications</strong>
                                            <button type="button" id="markNotificationsRead">Mark all as read</button>
                                        </div>
                                        <div class="notification-list" id="notificationList"></div>
                                    </div>
                                </div>

                                <a class="btn btn-outline" href="${root}pages/patient_profile.html">
                                    <i class="bi bi-person"></i> Profile
                                </a>

                                <button class="btn btn-danger" type="button" id="logoutButton">
                                    <i class="bi bi-box-arrow-right"></i> Logout
                                </button>
                            `
                            : `
                                <a class="btn btn-outline" href="${root}login.html">
                                    <i class="bi bi-box-arrow-in-right"></i> Login
                                </a>
                            `
                    }
                </div>

                <a class="btn btn-primary" href="${root}pages/appointment.html" id="startAppointmentNav">
                    <i class="bi bi-calendar-plus"></i> Start Appointment
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



function initDoctors() {
    const grid = q("#doctorGrid");
    if (!grid) return;

    const specialty = q("#doctorSpecialty");
    const nameInput = q("#doctorNameSearch");
    const count = q("#doctorCount");
    const noResults = q("#doctorNoResults");

    // Populate specialty filter using database values.
    [...new Set(DOCTORS.map(doctor => doctor.specialty))]
        .forEach(value => {
            specialty.insertAdjacentHTML(
                "beforeend",
                `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`
            );
        });

    const params = new URLSearchParams(location.search);

    // Read the selected department ID from the URL.
    const departmentId = params.get("department_id");

    function render() {
        const selectedSpecialty = specialty.value;
        const name = nameInput.value.toLowerCase().trim();

        const list = DOCTORS.filter(doctor =>
            (!departmentId || doctor.departmentId === String(departmentId)) &&
            (!selectedSpecialty || doctor.specialty === selectedSpecialty) &&
            (!name || doctor.name.toLowerCase().includes(name))
        );

        grid.innerHTML = list.map(doctor => `
            <article class="card doctor-card">
                <div class="doctor-avatar">
                    ${
                        doctor.photoUrl
                            ? `<img
                                    src="${escapeHtml(doctor.photoUrl)}"
                                    alt="Photo of ${escapeHtml(doctor.name)}"
                                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                            >`
                            : ""
                    }

                    <span style="display:${doctor.photoUrl ? "none" : "flex"}">
                        ${escapeHtml(doctor.initials)}
                    </span>
                </div>

                <div class="doctor-info">
                    <span class="status-badge status-info">
                        ${escapeHtml(doctor.specialty)}
                    </span>

                    <h3>${escapeHtml(doctor.name)}</h3>

                    <p class="body-text">
                        ${escapeHtml(doctor.position)}
                    </p>

                    <p class="muted-text">
                        <i class="bi bi-translate"></i>
                        ${escapeHtml(doctor.languages)}
                    </p>

                    <div class="doctor-actions">
                        <a class="btn btn-outline"
                           href="doctor_profile.html?doctor=${encodeURIComponent(doctor.id)}">
                            View Profile
                        </a>

                        <a class="btn btn-primary"
                           href="appointment.html?doctor=${encodeURIComponent(doctor.id)}">
                            Start Appointment
                        </a>
                    </div>
                </div>
            </article>
        `).join("");

        count.textContent =
            `Showing ${list.length} doctor${list.length === 1 ? "" : "s"}`;

        noResults.classList.toggle("hidden", list.length > 0);
    }

    // Preserve the specialty filter if one was supplied.
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

    const doctor = doctorById(
        new URLSearchParams(location.search).get("doctor")
    );

    if (!doctor) {
        location.href = "doctors.html";
        return;
    }

    document.title = doctor.name + " | The Care Hospital";

    // Doctor avatar
    const initials = q("#profileInitials");
    const photo = q("#profilePhoto");

    initials.textContent = doctor.initials;

    // Show initials first as the fallback
    initials.style.display = "flex";
    photo.style.display = "none";

    // Load the doctor's Cloudinary photo
    photo.onload = () => {
        photo.style.display = "block";
        initials.style.display = "none";
    };

    // If the photo fails, keep showing initials
    photo.onerror = () => {
        photo.style.display = "none";
        initials.style.display = "flex";
    };

    photo.src = doctor.photoUrl || "";

    // Doctor information
    q("#profileSpecialty").textContent = doctor.specialty;
    q("#profileDoctorName").textContent = doctor.name;
    q("#profilePosition").textContent = doctor.position;
    q("#profileExperience").textContent = doctor.experience;
    q("#profileLanguages").textContent = doctor.languages;
    q("#profileQualifications").textContent = doctor.qualifications;
    q("#profileAbout").textContent = doctor.about;

    q("#profileBook").href =
        "appointment.html?doctor=" + doctor.id;

    q("#profileInterests").innerHTML =
        doctor.interests.map(item =>
            `<span class="chip">${item}</span>`
        ).join("");

    q("#profileSchedule").innerHTML =
        Object.entries(doctor.schedule).map(([day, times]) => `
            <div class="schedule-row">
                <strong>${day}</strong>

                ${
                    times && times.length > 0
                        ? `
                            <span class="status-badge status-info">
                                ${times[0]} – ${times[times.length - 1]}
                            </span>
                        `
                        : `
                            <span class="status-badge">
                                Not Available
                            </span>
                        `
                }
            </div>
        `).join("");
}

function initDepartment() {
    const result = q("#routingResult");
    if (!result) return;

    // Display all six departments.
    q("#departmentCards").innerHTML = ROUTES.map(route => `
        <div class="card card-pad">
            <span class="icon-box">
                <i class="bi bi-hospital"></i>
            </span>

            <h3 class="section-title" style="margin-top:12px">
                ${escapeHtml(route.department)}
            </h3>

            <p class="muted-text">
                ${route.keywords.slice(0, 4).map(escapeHtml).join(" • ")}
            </p>

            <a class="btn btn-outline"
               href="doctors.html?department_id=${encodeURIComponent(route.departmentId)}">
                View Doctors
            </a>
        </div>
    `).join("");

    // Shared recommendation function.
    const recommendDepartment = () => {
        const text = q("#symptomInput").value
            .toLowerCase()
            .trim();

        // Check for empty input.
        if (!text) {
            result.innerHTML = `
                <div class="alert alert-danger">
                    Please enter at least one symptom or service need.
                </div>
            `;
            return;
        }

        // Split the patient's input into individual words.
        const inputWords = new Set(
            text.split(/[^a-z0-9]+/).filter(Boolean)
        );

        let best = null;
        let score = 0;

        // Find the department with the highest keyword match.
        ROUTES.forEach(route => {
            const currentScore = route.keywords.reduce(
                (total, keyword) => {
                    const keywordWords = keyword
                        .toLowerCase()
                        .split(/\s+/);

                    const keywordMatches = keywordWords.some(
                        word => inputWords.has(word)
                    );

                    return total + (keywordMatches ? 1 : 0);
                },
                0
            );

            if (currentScore > score) {
                score = currentScore;
                best = route;
            }
        });

        // Display message if no suitable department is found.
        if (!best) {
            result.innerHTML = `
                <div class="alert alert-warning">
                    <h3>No Suitable Department Found</h3>

                    <p>
                        Sorry, we couldn't find a suitable department
                        based on the symptoms you entered.
                    </p>

                    <p>
                        Please try describing your symptoms differently
                        or contact the hospital for assistance.
                    </p>
                </div>
            `;
            return;
        }

        // Display the recommended department.
        result.innerHTML = `
            <span class="status-badge status-info">RECOMMENDED</span>

            <h2 class="page-title" style="margin-top:12px">
                ${escapeHtml(best.department)}
            </h2>

            <p class="body-text">
                Based on the keywords entered, this is the closest
                matching department in this prototype.
                This routing does not provide a medical diagnosis.
            </p>

            <div class="doctor-actions">
                <a class="btn btn-primary"
                   href="doctors.html?department_id=${encodeURIComponent(best.departmentId)}">
                    View ${escapeHtml(best.department)} Doctors
                </a>

                <a class="btn btn-outline"
                   href="appointment.html?department_id=${encodeURIComponent(best.departmentId)}">
                    Book Appointment
                </a>
            </div>
        `;
    };

    // Recommend department when the button is clicked.
    q("#routeButton").addEventListener(
        "click",
        recommendDepartment
    );

    // Recommend department when Enter is pressed.
    q("#symptomInput").addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            recommendDepartment();
        }
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

    function getDepartmentForDoctor(doctor) {
        return departments.find(department =>
            Number(department.id) === Number(doctor.departmentId)
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
                    ${escapeHtml(time)}
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

        const department = getDepartmentForDoctor(selectedDoctor);

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

        if (form.dataset.saving === "true") return;

        form.dataset.saving = "true";

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
            form.dataset.saving = "false";

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

            const canManage = ["Confirmed", "Rescheduled"].includes(
                appointment.status
            );

            
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
                                Appointment ${escapeHtml(appointment.patientAppointmentNumber)}
                            </div>

                            <h2>${escapeHtml(doctorName)}</h2>
                        </div>

                        <span class="status-badge ${statusClass(appointment.status)}">
                            ${escapeHtml(appointment.status)}
                        </span>
                    </div>

                    <div class="appointment-detail-grid">

                        <div class="appointment-detail-item">
                            <i class="bi bi-hospital"></i>
                            <div>
                                <span>Department</span>
                                <strong>${escapeHtml(selectedDoctor?.department || "—")}</strong>
                            </div>
                        </div>

                        <div class="appointment-detail-item">
                            <i class="bi bi-heart-pulse"></i>
                            <div>
                                <span>Specialty</span>
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

                    </div>
                    <div class="appointment-notes">
                        <span>Reason / Notes</span>
                        <p>${escapeHtml(appointment.notes || "No notes provided.")}</p>
                    </div>

                    ${appointment.queueNumber ? `
                        <div class="appointment-queue">
                            <div class="appointment-queue-label">
                                <i class="bi bi-ticket-perforated"></i>
                                <span>QUEUE NUMBER</span>
                            </div>

                            <strong>${escapeHtml(appointment.queueNumber)}</strong>

                            <div class="appointment-queue-meta">
                                <span>
                                    Status:
                                    ${escapeHtml({
                                        WAIT: "Waiting",
                                        SERVING: "Now Serving",
                                        HOLD: "On Hold",
                                        COMPLETED: "Completed"
                                    }[appointment.queueStatus] || appointment.queueStatus || "Registered")}
                                </span>

                                ${appointment.registeredAt ? `
                                    <span>
                                        Registered:
                                        ${escapeHtml(new Date(appointment.registeredAt).toLocaleString("en-MY"))}
                                    </span>
                                ` : ""}
                            </div>
                        </div>
                    ` : ""}

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

    async function loadAppointments(showLoading = true) {
        if (showLoading) {
            listContainer.innerHTML =
                `<p class="muted-text">Loading your appointments...</p>`;
        }

        try {
            appointments = await fetchPatientAppointments();
            render();
        } catch (error) {
            console.error("Unable to refresh appointments:", error);

            if (showLoading) {
                listContainer.innerHTML = `
                    <p class="muted-text">
                        Unable to load appointments: ${escapeHtml(error.message)}
                    </p>
                `;
                emptyState.classList.add("hidden");
            }
        }
    }

    filter.addEventListener("change", render);

   loadAppointments();

    const appointmentRefreshInterval = setInterval(() => {
        if (document.visibilityState === "visible") {
            loadAppointments(false);
        }
    }, 5000);
}


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
        const appointments = await fetchPatientAppointments();

        const now = new Date();

        // Upcoming: confirmed or rescheduled appointments
        // whose actual appointment date and time are still in the future.
        const upcoming = appointments.filter(item => {
            const appointmentDateTime = new Date(
                `${item.date}T${item.time}:00`
            );

            return (
                ["Confirmed", "Rescheduled"].includes(item.status) &&
                appointmentDateTime > now
            );
        });

        // Registered / Queued: appointments with an issued QMS queue number.
        const registered = appointments.filter(item =>
            Boolean(item.queueNumber)
        );

        // Cancelled appointments.
        const cancelled = appointments.filter(item =>
            item.status === "Cancelled"
        );

        upcomingElement.textContent = upcoming.length;
        registeredElement.textContent = registered.length;
        cancelledElement.textContent = cancelled.length;

        // Find the nearest upcoming appointment.
        upcoming.sort((a, b) =>
            new Date(`${a.date}T${a.time}:00`) -
            new Date(`${b.date}T${b.time}:00`)
        );

        const next = upcoming[0];

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
   PATIENT PROFILE - DATABASE VERSION
========================= */
async function initPatientProfile() {
    const name = q("#patientProfileName");

    if (!name) return;
    if (!requireLogin()) return;

    const editButton = q("#editProfileBtn");
    const editForm = q("#profileEditForm");
    const cancelButton = q("#cancelEditProfileBtn");

    const emailDisplay = q("#patientProfileEmail");
    const icDisplay = q("#patientProfileIC");
    const dobDisplay = q("#patientProfileDOB");

    let currentPatient = null;

    function displayPatient(patient) {
        currentPatient = patient;

        name.textContent = patient.full_name || "—";

        q("#patientProfileId").textContent =
            patient.patient_number || patient.id || "—";

        emailDisplay.textContent =
            patient.email || "Not provided";

        icDisplay.textContent =
            patient.ic_number || "Not provided";

        dobDisplay.textContent =
            patient.date_of_birth
                ? formatDate(patient.date_of_birth)
                : "Not provided";
    }

    function closeEditForm() {
        editForm.hidden = true;
        editButton.hidden = false;
    }

    // Load patient profile from PostgreSQL.
    name.textContent = "Loading profile...";

    try {
        const result = await patientApiRequest("/patients/profile");

        if (!result.patient) {
            throw new Error("Patient profile was not returned.");
        }

        displayPatient(result.patient);

    } catch (error) {
        console.error("Patient profile loading failed:", error);

        name.textContent = "Unable to load profile";

        q("#patientProfileId").textContent = "—";
        emailDisplay.textContent = "—";
        icDisplay.textContent = "—";
        dobDisplay.textContent = "—";

        return;
    }

    // Open the edit form.
    editButton.addEventListener("click", () => {
        if (!currentPatient) return;

        q("#editProfileName").value =
            currentPatient.full_name || "";

        q("#editProfileEmail").value =
            currentPatient.email || "";

        q("#editProfileIC").value =
            currentPatient.ic_number || "";

        q("#editProfileDOB").value =
            currentPatient.date_of_birth
                ? String(currentPatient.date_of_birth).slice(0, 10)
                : "";

        editButton.hidden = true;
        editForm.hidden = false;
    });

    // Cancel editing.
    cancelButton.addEventListener("click", () => {
        closeEditForm();
    });

    // Save profile changes.
    editForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const fullName = q("#editProfileName").value.trim();

        const email = q("#editProfileEmail").value
            .trim()
            .toLowerCase();

        const icNumber = q("#editProfileIC").value
            .replace(/\D/g, "");

        const dateOfBirth = q("#editProfileDOB").value;

        if (!fullName) {
            alert("Please enter your full name.");
            return;
        }

        if (!email && !icNumber) {
            alert("Please provide an email address or IC number.");
            return;
        }

        if (email && !isValidEmail(email)) {
            alert("Please enter a valid email address.");
            return;
        }

        if (icNumber && !isValidIC(icNumber)) {
            alert("IC number must contain exactly 12 digits.");
            return;
        }

        const saveButton = editForm.querySelector(
            'button[type="submit"]'
        );

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            const result = await patientApiRequest(
                "/patients/profile",
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        full_name: fullName,
                        email: email,
                        ic_number: icNumber,
                        date_of_birth: dateOfBirth
                    })
                }
            );

            if (!result.patient) {
                throw new Error("Updated profile was not returned.");
            }

            displayPatient(result.patient);
            closeEditForm();

            alert("Your profile has been updated successfully.");

        } catch (error) {
            console.error("Patient profile update failed:", error);

            alert(
                error.message ||
                "Unable to update your profile. Please try again."
            );

        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save Changes";
        }
    });
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

    /* Load notifications from PostgreSQL */

    async function loadNotifications() {

        try {

            const response = await patientApiRequest("/notifications");

            notifications = response.notifications || [];

            renderNotifications();

        } catch (error) {

            console.error("Unable to load notifications:", error);

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

        }
    }

    /* Select notification icon */

    function getNotificationIcon(type) {

        const icons = {
            APPOINTMENT_CONFIRMED: "bi-check-circle",
            APPOINTMENT_RESCHEDULED: "bi-calendar-event",
            APPOINTMENT_REMINDER_7_DAYS: "bi-calendar-week",
            APPOINTMENT_REMINDER_1_DAY: "bi-alarm"
        };

        return icons[type] || "bi-bell";

    }

    /* Display notifications */

    function renderNotifications() {

        const unreadCount = notifications.filter(
            notification => !notification.is_read
        ).length;

        /* Update notification badge */

        if (unreadCount > 0) {

            badge.textContent = unreadCount;

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

        /* Render notification history */

        list.innerHTML = notifications.map(notification => {

            const icon = getNotificationIcon(
                notification.notification_type
            );

            return `
                <div class="
                    notification-item
                    ${notification.is_read ? "" : "unread"}
                ">

                    <div class="notification-icon">
                        <i class="bi ${icon}"></i>
                    </div>

                    <div class="notification-content">

                        <strong>
                            ${escapeHtml(notification.title)}
                        </strong>

                        <p>
                            ${escapeHtml(notification.message || "")}
                        </p>

                        <span>
                            ${escapeHtml(notification.detail || "")}
                        </span>

                    </div>

                </div>
            `;

        }).join("");

    }

    /* Initial notification loading */

    await loadNotifications();

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

    /* Mark all notifications as read */

    if (markReadButton) {

        markReadButton.addEventListener("click", async function() {

            try {

                await patientApiRequest("/notifications/read-all", {
                    method: "PATCH"
                });

                notifications = notifications.map(notification => ({
                    ...notification,
                    is_read: true
                }));

                renderNotifications();

            } catch (error) {

                console.error(
                    "Unable to mark notifications as read:",
                    error
                );

                alert("Unable to mark notifications as read. Please try again.");

            }

        });

    }

}




document.addEventListener("DOMContentLoaded", async () => {
    renderShell();

    try {
        await loadHospitalData();
    } catch (error) {
        console.error("Unable to load hospital data:", error);
    }

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

