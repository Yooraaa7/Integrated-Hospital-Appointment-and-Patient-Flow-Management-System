/* ====================================================================
   Analytics.js
   Shared by AppointmentDemand.html, PeakPeriods.html and DoctorUtilisation.html

   PART 1 (AppData) generates SAMPLE data so the pages work on their own.
          Replace it with data from your database: you need the same
          doctors, slots and appointments shapes described below.
   PART 2 (Charts) draws the charts. Keep it as it is.
   ==================================================================== */
(function () {
    "use strict";

    /* ---------------- small date helpers ---------------- */
    const pad = n => String(n).padStart(2, "0");
    const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    const parseISO = s => { const p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); };
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const shortDate = s => { const d = parseISO(s); return d.getDate() + " " + MONTHS[d.getMonth()]; };

    /* ====================================================================
       PART 1: SAMPLE DATA
       doctors:       { id, name, dept }
       slots:         { date, time, hour, dow, doctorId, dept, state, reason }
                      state = "booked" | "free" | "blocked"; reason = "OT" | "Leave" | "Other"
                      (one row per scheduled consultation slot; blocked = OT/leave)
       appointments:  { id, date, time, hour, dow, doctorId, dept, status }
                      status = Completed | No-show | Cancelled | Booked
       ==================================================================== */
    function mulberry32(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    const rand = mulberry32(20261016);

    const TODAY = new Date();

    const doctors = [
        { id: "D-001", name: "Dr. Tan Bee Lian",  dept: "General Medicine", base: 0.88 },
        { id: "D-002", name: "Dr. Ahmad Faris",   dept: "Cardiology",       base: 0.82 },
        { id: "D-003", name: "Dr. Lee Chong Wei", dept: "Orthopaedics",     base: 0.76 },
        { id: "D-004", name: "Dr. Siti Hajar",    dept: "Paediatrics",      base: 0.66 },
        { id: "D-005", name: "Dr. Nadia Rahman",  dept: "Dermatology",      base: 0.50 },
        { id: "D-006", name: "Dr. Kumar Selvam",  dept: "General Medicine", base: 0.56 }
    ];
    const departments = Array.from(new Set(doctors.map(d => d.dept)));

    const DAY_W  = { 1: 1.15, 2: 1.0, 3: 0.95, 4: 1.0, 5: 1.05, 6: 0.6 };
    const HOUR_W = { 9: 1.0, 10: 1.12, 11: 0.85, 14: 0.92, 15: 0.8, 16: 0.6 };
    const MORNING   = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
    const AFTERNOON = ["14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

    // Returns "OT", "Leave", "Other" or "" for a doctor, day and hour
    function blockReason(id, dow, hour, offset) {
        if (id === "D-003" && (dow === 2 || dow === 4) && (hour === 14 || hour === 15)) return "OT";
        if (id === "D-002" && dow === 3 && Math.floor(offset / 7) % 2 === 0 && (hour === 9 || hour === 10)) return "OT";
        if (id === "D-005" && ((offset >= 14 && offset <= 20) || (offset >= 3 && offset <= 5))) return "Leave";
        if (id === "D-004" && (offset === 40 || offset === 41)) return "Other";
        if (id === "D-006" && (offset === 30 || offset === 31)) return "Other";
        return "";
    }

    const slots = [];
    const appointments = [];
    let apptNo = 3000;

    for (let offset = 1; offset <= 190; offset++) {
        const date = addDays(TODAY, -offset);
        const dow = date.getDay();
        if (dow === 0) continue;                                   // closed on Sunday
        const times = dow === 6 ? MORNING : MORNING.concat(AFTERNOON); // Saturday morning only

        doctors.forEach(doc => {
            times.forEach(time => {
                const hour = Number(time.slice(0, 2));
                const slot = { date: iso(date), time: time, hour: hour, dow: dow, doctorId: doc.id, dept: doc.dept, state: "free", reason: "" };
                const reason = blockReason(doc.id, dow, hour, offset);

                if (reason) {
                    slot.state = "blocked";
                    slot.reason = reason;
                } else {
                    const p = Math.min(0.97, doc.base * DAY_W[dow] * HOUR_W[hour] * (0.9 + rand() * 0.2));
                    if (rand() < p) {
                        const r = rand();
                        const status = r < 0.09 ? "Cancelled" : r < 0.15 ? "No-show" : "Completed";
                        appointments.push({ id: "A-" + (apptNo++), date: slot.date, time: time, hour: hour, dow: dow,
                                            doctorId: doc.id, dept: doc.dept, status: status });
                        if (status !== "Cancelled") slot.state = "booked";   // a cancelled slot is free again
                    }
                }
                slots.push(slot);
            });
        });
    }

    /* ---------------- query helpers ---------------- */
    function rangeFor(days) {
        const to = addDays(TODAY, -1);
        const from = addDays(to, -(days - 1));
        const pTo = addDays(from, -1);
        const pFrom = addDays(pTo, -(days - 1));
        return { days: days, from: iso(from), to: iso(to), prevFrom: iso(pFrom), prevTo: iso(pTo) };
    }

    function appointmentsIn(from, to, opt) {
        opt = opt || {};
        return appointments.filter(a =>
            a.date >= from && a.date <= to &&
            (!opt.dept || a.dept === opt.dept) &&
            (!opt.doctorId || a.doctorId === opt.doctorId) &&
            (opt.includeCancelled || a.status !== "Cancelled"));
    }

    function slotsIn(from, to, opt) {
        opt = opt || {};
        return slots.filter(s =>
            s.date >= from && s.date <= to &&
            (!opt.dept || s.dept === opt.dept) &&
            (!opt.doctorId || s.doctorId === opt.doctorId));
    }

    window.AppData = {
        doctors: doctors, departments: departments, slots: slots, appointments: appointments,
        rangeFor: rangeFor, appointmentsIn: appointmentsIn, slotsIn: slotsIn,
        iso: iso, addDays: addDays, parseISO: parseISO, shortDate: shortDate
    };

    /* ====================================================================
       PART 2: CHART HELPERS
       ==================================================================== */
    function niceStep(x) {
        const p = Math.pow(10, Math.floor(Math.log10(x || 1)));
        const n = x / p;
        return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
    }

    const Charts = {

        // Horizontal bars. items: [{ label, value, text, cls }]
        hbars: function (container, items) {
            const max = Math.max(1, ...items.map(i => i.value));
            container.innerHTML = items.map(i =>
                '<div class="progress-row">' +
                    '<div class="progress-meta"><span>' + i.label + '</span><strong>' + i.text + '</strong></div>' +
                    '<div class="progress-track"><div class="progress-fill ' + (i.cls || "") + '" style="width:' + (i.value / max * 100).toFixed(1) + '%;"></div></div>' +
                '</div>').join("");
        },

        // Column chart. items: [{ label, value, highlight }]
        columns: function (container, items) {
            const max = Math.max(1, ...items.map(i => i.value));
            container.innerHTML =
                '<div class="bar-chart">' + items.map(i =>
                    '<div class="bar-col"><span class="bar-value">' + i.value + '</span>' +
                    '<div class="bar' + (i.highlight ? " today" : "") + '" style="height:' + (i.value / max * 80).toFixed(1) + '%;"></div></div>').join("") +
                '</div>' +
                '<div class="bar-labels">' + items.map(i => '<span>' + i.label + '</span>').join("") + '</div>';
        },

        // Line chart with a light area fill. labels and values have the same length.
        line: function (container, labels, values, ariaLabel) {
            const W = 640, H = 230, L = 40, R = 12, T = 12, B = 30;
            const max = Math.max(1, ...values);
            const step = niceStep(max / 4);
            const top = Math.ceil(max / step) * step;
            const x = i => L + (values.length === 1 ? 0 : i * (W - L - R) / (values.length - 1));
            const y = v => T + (H - T - B) * (1 - v / top);

            let grid = "";
            for (let v = 0; v <= top; v += step) {
                grid += '<line x1="' + L + '" y1="' + y(v) + '" x2="' + (W - R) + '" y2="' + y(v) + '" stroke="#e2e8f0" stroke-width="1"/>' +
                        '<text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end" font-size="11" fill="#6b7280">' + v + '</text>';
            }

            const every = Math.ceil(values.length / 8);
            let xl = "";
            labels.forEach((lab, i) => {
                if (i % every === 0) xl += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="#6b7280">' + lab + '</text>';
            });

            const pts = values.map((v, i) => x(i).toFixed(1) + "," + y(v).toFixed(1));
            const area = "M" + x(0).toFixed(1) + "," + y(0) + " L" + pts.join(" L") + " L" + x(values.length - 1).toFixed(1) + "," + y(0) + " Z";
            const dots = values.length <= 31
                ? values.map((v, i) => '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="3" fill="#1677ff"><title>' + labels[i] + ": " + v + '</title></circle>').join("")
                : "";

            container.innerHTML =
                '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + (ariaLabel || "Trend chart") + '">' +
                grid + xl +
                '<path d="' + area + '" fill="rgba(22,119,255,0.12)"/>' +
                '<polyline points="' + pts.join(" ") + '" fill="none" stroke="#1677ff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
                dots + '</svg>';
        },

        // Heatmap. matrix[row][col] holds numbers.
        heatmap: function (container, rowLabels, colLabels, matrix, unit) {
            let max = 1;
            matrix.forEach(r => r.forEach(v => { if (v > max) max = v; }));

            let html = '<div class="heatmap" style="grid-template-columns: 90px repeat(' + colLabels.length + ', 1fr);">' +
                       '<div></div>' + colLabels.map(c => '<div class="heat-colhead">' + c + '</div>').join("");

            rowLabels.forEach((rl, r) => {
                html += '<div class="heat-label">' + rl + '</div>';
                matrix[r].forEach((v, c) => {
                    const a = 0.08 + 0.92 * (v / max);
                    const color = a > 0.55 ? "#ffffff" : "#0f172a";
                    html += '<div class="heat-cell" style="background-color: rgba(22,119,255,' + a.toFixed(2) + '); color:' + color + ';" title="' +
                            rl + " " + colLabels[c] + ": " + v + " " + unit + '">' + v + '</div>';
                });
            });

            container.innerHTML = html + "</div>" +
                '<div class="heat-legend"><span>Fewer</span><span class="heat-gradient"></span><span>More</span></div>';
        },

        // "up 8%" style text. current and previous are numbers.
        change: function (current, previous) {
            if (!previous) return '<span class="trend-flat">no earlier data</span>';
            const pct = Math.round((current - previous) / previous * 100);
            if (pct > 0) return '<span class="trend-up">&#9650; ' + pct + '%</span> vs previous period';
            if (pct < 0) return '<span class="trend-down">&#9660; ' + Math.abs(pct) + '%</span> vs previous period';
            return '<span class="trend-flat">no change</span> vs previous period';
        }
    };

    window.Charts = Charts;
})();