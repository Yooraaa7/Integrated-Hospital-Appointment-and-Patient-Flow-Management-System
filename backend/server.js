const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/database");

const departmentRoutes = require("./routes/departmentRoutes");
const counterRoutes = require("./routes/counterRoutes");

const app = express();

app.use(cors());
app.use(express.json());


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

app.use("/api/departments", departmentRoutes);
app.use("/api/counters", counterRoutes);


/* ============================================================
   START SERVER
   ============================================================ */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(
        `QMS backend running on http://localhost:${PORT}`
    );
});