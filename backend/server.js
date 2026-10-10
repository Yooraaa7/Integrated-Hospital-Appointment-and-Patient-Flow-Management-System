const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/database");

const departmentRoutes = require("./routes/departmentRoutes");
const counterRoutes = require("./routes/counterRoutes");
const patientRoutes = require("./routes/patientRoutes");
const queueRoutes = require("./routes/queueRoutes");

const app = express();

app.disable("x-powered-by");
app.use(cors({origin: process.env.ALLOWED_ORIGIN || false}));
app.use(express.json({limit:"16kb"}));
const path = require("path");
app.use(express.static(path.resolve(__dirname,"..")));
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) { throw new Error("Configure JWT_SECRET of at least 32 characters in .env"); }


/* ============================================================
   TEST ROUTE
   ============================================================ */

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "QMS Backend API is running"
    });
});


/* ============================================================
   DATABASE TEST
   ============================================================ */

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
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});


/* ============================================================
   QMS ROUTES
   ============================================================ */

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/departments", departmentRoutes);
app.use("/api/counters", counterRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/queues", queueRoutes);


/* ============================================================
   START SERVER
   ============================================================ */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(
        `QMS backend running on http://localhost:${PORT}`
    );
});