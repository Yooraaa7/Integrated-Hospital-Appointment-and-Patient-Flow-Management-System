
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

                <a class="navbar-logo" href="${root}index.html">
                    <img src="${root}assets/logo.png" alt="The Care Hospital">
                </a>

                <nav class="navbar-links">
                    ${navLink("home", "Home", "index.html")}
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

    form.addEventListener("submit", event => {
        event.preventDefault();

        const fullName = q("#signupName").value.trim();
        const identifier = q("#signupIdentifier").value.trim();
        const dateOfBirth = q("#signupDOB").value;
        const password = q("#signupPassword").value;
        const confirmPassword = q("#signupConfirmPassword").value;
        const terms = q("#signupTerms").checked;
        const message = q("#signupMessage");

        if (!fullName) {
            message.innerHTML = `<div class="alert alert-danger">Please enter your full name.</div>`;
            return;
        }

        if (!isValidEmail(identifier) && !isValidIC(identifier)) {
            message.innerHTML = `<div class="alert alert-danger">Please enter a valid email address or 12-digit IC number.</div>`;
            return;
        }

        if (!dateOfBirth) {
            message.innerHTML = `<div class="alert alert-danger">Please enter your date of birth.</div>`;
            return;
        }

        if (new Date(dateOfBirth + "T00:00:00") > new Date()) {
            message.innerHTML = `<div class="alert alert-danger">Date of birth cannot be in the future.</div>`;
            return;
        }

        if (!isValidPassword(password)) {
            message.innerHTML = `
                <div class="alert alert-danger">
                    Password must be at least 8 characters and contain a capital letter, a number and a special character.
                </div>
            `;
            return;
        }

        if (password !== confirmPassword) {
            message.innerHTML = `<div class="alert alert-danger">Password and Confirm Password do not match.</div>`;
            return;
        }

        if (!terms) {
            message.innerHTML = `<div class="alert alert-danger">Please agree to the Terms & Conditions.</div>`;
            return;
        }

        const users = getRegisteredUsers();
        const key = identifierKey(identifier);

        if (users.some(user => user.identifierKey === key)) {
            message.innerHTML = `<div class="alert alert-danger">An account using this email or IC already exists.</div>`;
            return;
        }

        const newUser = {
            id: "PAT-" + Date.now(),
            fullName,
            identifier,
            identifierKey: key,
            identifierType: isValidIC(identifier) ? "IC" : "Email",
            dateOfBirth,
            password,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveRegisteredUsers(users);

        message.innerHTML = `<div class="alert alert-success">Account created successfully. Redirecting to login...</div>`;

        setTimeout(() => {
            location.href = "login.html";
        }, 800);
    });
}

function initLogin() {
    const form = q("#loginForm");
    if (!form) return;

    form.addEventListener("submit", event => {
        event.preventDefault();

        const identifier = q("#loginIdentifier").value.trim();
        const password = q("#loginPassword").value;
        const message = q("#loginMessage");
        const key = identifierKey(identifier);

        const account = getRegisteredUsers().find(user =>
            user.identifierKey === key &&
            user.password === password
        );

        if (!account) {
            message.innerHTML = `<div class="alert alert-danger">Incorrect email / IC number or password.</div>`;
            return;
        }

        setUser({
            id: account.id,
            name: account.fullName,
            identifier: account.identifier,
            identifierType: account.identifierType,
            dateOfBirth: account.dateOfBirth
        });

        const returnTo = localStorage.getItem("careReturnTo");
        localStorage.removeItem("careReturnTo");

        location.href = returnTo || "pages/patient_dashboard.html";
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
   APPOINTMENT BOOKING
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

    const specialties = [...new Set(DOCTORS.map(item => item.specialty))];

    specialty.innerHTML =
        `<option value="">Select specialty</option>` +
        specialties.map(item => `<option>${item}</option>`).join("");

    dateInput.min = localToday();

    function fillDoctors(selected = "") {
        const list = DOCTORS.filter(item =>
            !specialty.value ||
            item.specialty === specialty.value
        );

        doctor.innerHTML =
            `<option value="">Select doctor</option>` +
            list.map(item => `<option value="${item.id}">${item.name}</option>`).join("");

        if (selected) doctor.value = selected;
    }

    function weekday(date) {
        return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "long"
        });
    }

    function updateSummary() {
        const selectedDoctor = doctorById(doctor.value);

        summary.innerHTML = selectedDoctor
            ? `
                <p>
                    <strong>${selectedDoctor.name}</strong><br>
                    ${selectedDoctor.specialty}
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

    function renderSlots(selectedTime = "") {
        const selectedDoctor = doctorById(doctor.value);

        if (!selectedDoctor || !dateInput.value) {
            slots.innerHTML = `<span class="muted-text">Choose a doctor and date.</span>`;
            return;
        }

        const available = selectedDoctor.schedule[weekday(dateInput.value)] || [];
        const appointments = getAppointments();

        if (!available.length) {
            slots.innerHTML = `<span class="muted-text">Doctor has no consultation session on this day.</span>`;
            timeInput.value = "";
            updateSummary();
            return;
        }

        slots.innerHTML = available.map(time => {
            const taken = appointments.some(appointment =>
                appointment.id !== editId &&
                appointment.doctorId === selectedDoctor.id &&
                appointment.date === dateInput.value &&
                appointment.time === time &&
                appointment.status !== "Cancelled"
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
                    data-time="${time}"
                    ${unavailable ? "disabled" : ""}
                >
                    ${time}${timePassed ? " (Passed)" : ""}
                </button>
            `;
        }).join("");

        qa(".slot-btn:not(:disabled)").forEach(button => {
            button.addEventListener("click", () => {
                qa(".slot-btn").forEach(item => item.classList.remove("selected"));
                button.classList.add("selected");
                timeInput.value = button.dataset.time;
                updateSummary();
            });
        });

        if (dateInput.value === localToday() && qa(".slot-btn:not(:disabled)").length === 0) {
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

    if (editId) {
        editing = getAppointments().find(item => item.id === editId);

        if (editing) {
            q("#appointmentPageTitle").textContent = "Reschedule Appointment";
            q("#appointmentSubmitText").textContent = "Save New Schedule";

            specialty.value = editing.specialty;
            fillDoctors(editing.doctorId);
            dateInput.value = editing.date;
            notes.value = editing.notes || "";
            timeInput.value = editing.time;
            renderSlots(editing.time);
            updateSummary();
        }
    }

    if (!editing) {
        const doctorId = params.get("doctor");
        const requestedSpecialty = params.get("specialty");

        if (doctorId) {
            const selectedDoctor = doctorById(doctorId);

            if (selectedDoctor) {
                specialty.value = selectedDoctor.specialty;
                fillDoctors(doctorId);
            }
        } else if (requestedSpecialty) {
            specialty.value = requestedSpecialty;
            fillDoctors();
        } else {
            fillDoctors();
        }
    }

    form.addEventListener("submit", event => {
        event.preventDefault();

        if (!doctor.value || !dateInput.value || !timeInput.value) {
            alert("Please choose a doctor, date and available time.");
            return;
        }

        const selectedDoctor = doctorById(doctor.value);
        const appointments = getAppointments();

        const conflict = appointments.some(appointment =>
            appointment.id !== editId &&
            appointment.doctorId === selectedDoctor.id &&
            appointment.date === dateInput.value &&
            appointment.time === timeInput.value &&
            appointment.status !== "Cancelled"
        );

        if (conflict) {
            alert("That appointment slot is no longer available.");
            renderSlots();
            return;
        }

        if (editing) {
            Object.assign(editing, {
                doctorId: selectedDoctor.id,
                doctorName: selectedDoctor.name,
                specialty: selectedDoctor.specialty,
                date: dateInput.value,
                time: timeInput.value,
                notes: notes.value,
                status: "Confirmed",
                queueNumber: null,
                queueStatus: null,
                registeredAt: null,
                updatedAt: new Date().toISOString()
            });
        } else {
            const user = getUser();

            appointments.push({
                id: "APT-" + Date.now(),
                patientId: user.id,
                patientIdentifier: user.identifier,
                doctorId: selectedDoctor.id,
                doctorName: selectedDoctor.name,
                specialty: selectedDoctor.specialty,
                date: dateInput.value,
                time: timeInput.value,
                notes: notes.value,
                status: "Confirmed",
                createdAt: new Date().toISOString()
            });
        }

        saveAppointments(appointments);
        location.href = "appointment_history.html";
    });
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

function initHistory() {
    const listContainer = q("#appointmentList");
    if (!listContainer) return;
    if (!requireLogin()) return;

    const emptyState = q("#appointmentEmpty");
    const filter = q("#appointmentFilter");
    const modal = q("#registerModal");

    function registrationState(appointment) {
        if (appointment.status !== "Confirmed") {
            return {
                allowed: false,
                reason: "Registration is only available for confirmed appointments."
            };
        }

        if (appointment.queueNumber) {
            return {
                allowed: false,
                registered: true
            };
        }

        if (appointment.date < localToday()) {
            return {
                allowed: false,
                reason: "This appointment date has already passed."
            };
        }

        if (appointment.date > localToday()) {
            return {
                allowed: false,
                reason: "Register becomes available on the appointment day."
            };
        }

        return { allowed: true };
    }

    function showQueueModal(appointment) {
        q("#modalQueueNumber").textContent = appointment.queueNumber || "—";
        q("#modalDoctor").textContent = appointment.doctorName || "—";
        q("#modalAppointmentTime").textContent =
            `${formatDate(appointment.date)} • ${appointment.time}`;
        q("#modalRegisteredAt").textContent =
            formatClock(appointment.registeredAt);

        modal.classList.remove("hidden");
        document.body.classList.add("modal-open");
    }

    function closeModal() {
        modal.classList.add("hidden");
        document.body.classList.remove("modal-open");
    }

    function registerArrival(id) {
        const appointments = getAppointments();
        const user = getUser();

        const appointment = appointments.find(item =>
            item.id === id &&
            item.patientId === user.id
        );

        if (!appointment) return;

        const state = registrationState(appointment);

        if (!state.allowed) {
            alert(state.reason || "This appointment cannot be registered.");
            render();
            return;
        }

        const queue = getQMSQueue();
        const existing = queue.find(item => item.appointmentId === appointment.id);

        if (existing) {
            appointment.queueNumber = existing.queueNumber;
            appointment.queueStatus = existing.queueStatus;
            appointment.registeredAt = existing.registeredAt;
            saveAppointments(appointments);
            render();
            showQueueModal(appointment);
            return;
        }

        const registeredAt = new Date().toISOString();

        const queueEntry = {
            queueId: "Q-" + Date.now(),
            queueNumber: generateQueueNumber(appointment, queue),
            appointmentId: appointment.id,
            patientId: user.id,
            patientName: user.name,
            doctorId: appointment.doctorId,
            doctorName: appointment.doctorName,
            specialty: appointment.specialty,
            appointmentDate: appointment.date,
            appointmentTime: appointment.time,
            registeredAt,
            queueStatus: "Waiting"
        };

        queue.push(queueEntry);
        saveQMSQueue(queue);

        appointment.queueNumber = queueEntry.queueNumber;
        appointment.queueStatus = "Waiting";
        appointment.registeredAt = registeredAt;
        appointment.registrationStatus = "Registered";
        appointment.updatedAt = registeredAt;

        saveAppointments(appointments);

        window.dispatchEvent(new CustomEvent("care:qms-register", {
            detail: queueEntry
        }));

        render();
        showQueueModal(appointment);
    }

    function render() {
        const user = getUser();
        const selectedFilter = filter.value;

        const list = getAppointments()
            .filter(appointment =>
                appointment.patientId === user.id &&
                (selectedFilter === "All" || appointment.status === selectedFilter)
            )
            .sort((a, b) =>
                `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)
            );

        emptyState.classList.toggle("hidden", list.length > 0);

        listContainer.innerHTML = list.map(appointment => {
            const selectedDoctor = doctorById(appointment.doctorId);
            const state = registrationState(appointment);

            const queueBlock = appointment.queueNumber
                ? `
                    <div class="appointment-queue">
                        <div class="appointment-queue-label">
                            <i class="bi bi-people"></i>
                            <span>Queue Number</span>
                        </div>

                        <strong>${escapeHtml(appointment.queueNumber)}</strong>

                        <div class="appointment-queue-meta">
                            <span class="status-badge status-warning">
                                ${escapeHtml(appointment.queueStatus || "Waiting")}
                            </span>

                            <span>
                                Registered ${formatClock(appointment.registeredAt)}
                            </span>
                        </div>
                    </div>
                `
                : "";

            let actions = `<span class="muted-text">No actions available</span>`;

            if (appointment.status === "Confirmed") {
                const registerButton = state.registered
                    ? `
                        <button class="btn btn-success" disabled>
                            <i class="bi bi-check-circle"></i>
                            Registered
                        </button>
                    `
                    : state.allowed
                        ? `
                            <button class="btn btn-success" data-register="${appointment.id}">
                                <i class="bi bi-person-check"></i>
                                Register
                            </button>
                        `
                        : `
                            <button class="btn btn-light" disabled>
                                <i class="bi bi-person-check"></i>
                                Register
                            </button>
                        `;

                actions = `
                    ${registerButton}

                    <a class="btn btn-outline" href="appointment.html?edit=${appointment.id}">
                        <i class="bi bi-calendar-event"></i>
                        Reschedule
                    </a>

                    <button class="btn btn-danger" data-cancel="${appointment.id}">
                        <i class="bi bi-x-circle"></i>
                        Cancel
                    </button>

                    ${
                        !state.allowed && !state.registered
                            ? `<span class="appointment-action-note">${escapeHtml(state.reason)}</span>`
                            : ""
                    }
                `;
            }

            return `
                <article class="card appointment-detail-card">

                    <div class="appointment-card-header">
                        <div>
                            <div class="appointment-reference">
                                <i class="bi bi-receipt"></i>
                                Appointment ${escapeHtml(appointment.id)}
                            </div>

                            <h2>${escapeHtml(appointment.doctorName)}</h2>
                            <p>${escapeHtml(selectedDoctor?.position || appointment.specialty)}</p>
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
                                <strong>${escapeHtml(appointment.specialty)}</strong>
                            </div>
                        </div>

                        <div class="appointment-detail-item">
                            <i class="bi bi-calendar3"></i>
                            <div>
                                <span>Appointment Date</span>
                                <strong>${formatDate(appointment.date)}</strong>
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
                                <strong>${escapeHtml(appointment.doctorName)}</strong>
                            </div>
                        </div>

                    </div>

                    <div class="appointment-notes">
                        <span>Reason / Notes</span>
                        <p>${appointment.notes ? escapeHtml(appointment.notes) : "No additional notes provided."}</p>
                    </div>

                    ${queueBlock}

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

        qa("[data-register]").forEach(button => {
            button.addEventListener("click", () => {
                registerArrival(button.dataset.register);
            });
        });

        qa("[data-cancel]").forEach(button => {
            button.addEventListener("click", () => {
                if (!confirm("Cancel this appointment?")) return;

                const appointments = getAppointments();
                const user = getUser();

                const appointment = appointments.find(item =>
                    item.id === button.dataset.cancel &&
                    item.patientId === user.id
                );

                if (!appointment || appointment.status !== "Confirmed") return;

                if (appointment.queueNumber) {
                    alert("This appointment has already been registered into the queue.");
                    return;
                }

                appointment.status = "Cancelled";
                appointment.updatedAt = new Date().toISOString();

                saveAppointments(appointments);
                render();
            });
        });
    }

    filter.addEventListener("change", render);

    q("#closeRegisterModal").addEventListener("click", closeModal);
    q("#doneRegisterModal").addEventListener("click", closeModal);

    modal.addEventListener("click", event => {
        if (event.target === modal) closeModal();
    });

    render();
}

/* =========================
   DASHBOARD
========================= */
function initDashboard() {
    const welcome = q("#dashboardWelcome");
    if (!welcome) return;
    if (!requireLogin()) return;

    const user = getUser();
    const appointments = getAppointments()
        .filter(item => item.patientId === user.id);

    welcome.textContent = "Welcome, " + user.name;

    q("#dashboardUpcoming").textContent =
        appointments.filter(item =>
            item.status === "Confirmed" &&
            item.date >= localToday()
        ).length;

    q("#dashboardCancelled").textContent =
        appointments.filter(item => item.status === "Cancelled").length;

    q("#dashboardRegistered").textContent =
        appointments.filter(item => !!item.queueNumber).length;

    const next = appointments
        .filter(item =>
            item.status === "Confirmed" &&
            item.date >= localToday()
        )
        .sort((a, b) =>
            `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)
        )[0];

    q("#dashboardNext").innerHTML = next
        ? `
            <strong>${escapeHtml(next.doctorName)}</strong><br>
            ${escapeHtml(next.specialty)}<br>
            ${formatDate(next.date)} at ${escapeHtml(next.time)}
        `
        : "No upcoming appointment.";
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
   NOTIFICATIONS
========================= */

function initNotifications() {

    const button =
        document.getElementById(
            "notificationButton"
        );


    const dropdown =
        document.getElementById(
            "notificationDropdown"
        );


    const list =
        document.getElementById(
            "notificationList"
        );


    const badge =
        document.getElementById(
            "notificationBadge"
        );


    const markReadButton =
        document.getElementById(
            "markNotificationsRead"
        );


    if (
        !button ||
        !dropdown ||
        !list ||
        !badge
    ) {

        return;

    }


    const user =
        getUser();


    if (!user) {

        return;

    }



    /* Get patient's appointments */

    const appointments =
        getAppointments()
            .filter(
                appointment =>
                    appointment.patientId
                    === user.id
            );



    const notifications = [];



    /* =========================================
   APPOINTMENT NOTIFICATIONS
========================================= */

        appointments
            .filter(
                appointment =>
                    appointment.status === "Confirmed"
            )
            .forEach(
                appointment => {

                    const appointmentDate =
                        new Date(
                            appointment.date + "T00:00:00"
                        );

                    const today =
                        new Date(
                            localToday() + "T00:00:00"
                        );


                    const differenceInMilliseconds =
                        appointmentDate - today;


                    const daysBeforeAppointment =
                        Math.ceil(
                            differenceInMilliseconds
                            /
                            (1000 * 60 * 60 * 24)
                        );


                    /* =================================
                    APPOINTMENT CONFIRMED
                    ================================= */

                    notifications.push({

                        id:
                            "confirmed-" +
                            appointment.id,

                        icon:
                            "bi-check-circle",

                        title:
                            "Appointment Confirmed",

                        message:
                            appointment.doctorName,

                        detail:
                            formatDate(
                                appointment.date
                            )
                            +
                            " • "
                            +
                            appointment.time

                    });



                    /* =================================
                    1 WEEK BEFORE
                    ================================= */

                    if (
                        daysBeforeAppointment === 7
                    ) {

                        notifications.push({

                            id:
                                "7day-" +
                                appointment.id,

                            icon:
                                "bi-calendar-week",

                            title:
                                "Appointment in 1 Week",

                            message:
                                appointment.doctorName,

                            detail:
                                formatDate(
                                    appointment.date
                                )
                                +
                                " • "
                                +
                                appointment.time

                        });

                    }



                    /* =================================
                    1 DAY BEFORE
                    ================================= */

                    if (
                        daysBeforeAppointment === 1
                    ) {

                        notifications.push({

                            id:
                                "1day-" +
                                appointment.id,

                            icon:
                                "bi-alarm",

                            title:
                                "Appointment Tomorrow",

                            message:
                                appointment.doctorName,

                            detail:
                                formatDate(
                                    appointment.date
                                )
                                +
                                " • "
                                +
                                appointment.time

                        });

                    }

                }
            );

    /* Queue registration notification */

    appointments
        .filter(
            appointment =>
                appointment.queueNumber
        )
        .forEach(
            appointment => {

                notifications.push({

                    id:
                        "queue-" +
                        appointment.id,

                    icon:
                        "bi-people",

                    title:
                        "Queue Registration",

                    message:
                        "Queue "
                        +
                        appointment.queueNumber,

                    detail:
                        appointment.queueStatus
                        || "Waiting"

                });

            }
        );



    /* Read notification IDs */

    const readNotifications =
        JSON.parse(
            localStorage.getItem(
                "careReadNotifications"
            )
            || "[]"
        );



    const unread =
        notifications.filter(
            notification =>
                !readNotifications.includes(
                    notification.id
                )
        );



    /* Update badge */

    if (unread.length > 0) {

        badge.textContent =
            unread.length;

        badge.classList.remove(
            "hidden"
        );

    }

    else {

        badge.classList.add(
            "hidden"
        );

    }



    /* Display notifications */

    if (
        notifications.length
        === 0
    ) {

        list.innerHTML = `

            <div class="notification-empty">

                <i class="bi bi-bell"></i>

                <p>
                    No notifications yet.
                </p>

            </div>

        `;

    }

    else {

        list.innerHTML =
            notifications
                .map(
                    notification => {

                        const isRead =
                            readNotifications
                                .includes(
                                    notification.id
                                );


                        return `

                            <div
                                class="
                                    notification-item
                                    ${
                                        isRead
                                            ? ""
                                            : "unread"
                                    }
                                "
                            >

                                <div
                                    class="
                                        notification-icon
                                    "
                                >

                                    <i
                                        class="
                                            bi
                                            ${notification.icon}
                                        "
                                    ></i>

                                </div>


                                <div
                                    class="
                                        notification-content
                                    "
                                >

                                    <strong>
                                        ${notification.title}
                                    </strong>

                                    <p>
                                        ${notification.message}
                                    </p>

                                    <span>
                                        ${notification.detail}
                                    </span>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }



    /* Open / close notification dropdown */

    button.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

            dropdown.classList.toggle(
                "hidden"
            );

        }
    );



    /* Click outside closes dropdown */

    document.addEventListener(
        "click",
        function (event) {

            if (
                !dropdown.contains(
                    event.target
                )

                &&

                !button.contains(
                    event.target
                )
            ) {

                dropdown.classList.add(
                    "hidden"
                );

            }

        }
    );



    /* Mark everything read */

    if (markReadButton) {

        markReadButton.addEventListener(
            "click",
            function () {

                const ids =
                    notifications.map(
                        notification =>
                            notification.id
                    );


                localStorage.setItem(
                    "careReadNotifications",
                    JSON.stringify(ids)
                );


                badge.classList.add(
                    "hidden"
                );


                document
                    .querySelectorAll(
                        ".notification-item"
                    )
                    .forEach(
                        item =>
                            item.classList.remove(
                                "unread"
                            )
                    );

            }
        );

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
