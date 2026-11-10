const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config();

const pool = require("./config/database");

const departmentRoutes = require("./routes/departmentRoutes");
const counterRoutes = require("./routes/counterRoutes");
const patientRoutes = require("./routes/patientRoutes");
const queueRoutes = require("./routes/queueRoutes");
const trackingRoutes = require("./routes/trackingRoutes");
const appointmentQueueRoutes = require("./routes/appointmentQueueRoutes");

const {
    startQueueExpirationScheduler
} = require("./services/queueExpirationService");

const app = express();

app.disable("x-powered-by");


const allowedOrigins = new Set([
    // Local development
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",

    // Deployed Patient Website
    "https://thecare-patient-website.onrender.com",

    // Additional origins from environment variables
    ...String(process.env.ALLOWED_ORIGIN || "").split(","),
    ...String(process.env.PATIENT_FRONTEND_ORIGIN || "").split(",")
]
    .map(origin => origin.trim())
    .filter(Boolean)
);


app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }

        return callback(
            new Error("Origin is not allowed by CORS")
        );
    },

    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization"
    ]
}));

app.use(express.json({
    limit: "16kb"
}));

// Serve frontend folders only.
const publicRoot = path.resolve(__dirname, "..");

app.use(
    "/pages",
    express.static(path.join(publicRoot, "pages"))
);

app.use(
    "/js",
    express.static(path.join(publicRoot, "js"))
);

app.use(
    "/css",
    express.static(path.join(publicRoot, "css"))
);

app.use(
    "/assets",
    express.static(path.join(publicRoot, "assets"))
);

app.use(
    "/api/appointment-queues",
    appointmentQueueRoutes
);

app.get("/index.html", (req, res) => {
    res.sendFile(path.join(publicRoot, "index.html"));
});

// JWT configuration
if (!process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 32) {
    throw new Error(
        "Configure JWT_SECRET with at least 32 characters"
    );
}

// Backend test
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "QMS Backend API is running"
    });
});

// PostgreSQL connection test
app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT NOW() AS current_time"
        );

        res.json({
            success: true,
            message: "Database connection successful",
            databaseTime: result.rows[0].current_time
        });

    } catch (error) {
        console.error("Database error:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});

// Existing QMS routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/departments", departmentRoutes);
app.use("/api/counters", counterRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/queues", queueRoutes);

// Public QR tracking route
app.use("/api/tracking", trackingRoutes);

// Start backend
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
    console.log(`QMS backend running on ${HOST}:${PORT}`);

    // Start the local scheduler only when explicitly enabled.
    if (process.env.RUN_QUEUE_EXPIRATION_SCHEDULER === "true") {
        startQueueExpirationScheduler();
        console.log("[Queue Expiration] Local scheduler enabled.");
    } else {
        console.log(
            "[Queue Expiration] In-process scheduler disabled."
        );
    }
});
