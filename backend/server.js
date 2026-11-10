require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const authRoutes = require("./routes/auth");
const appointmentRoutes = require("./routes/appointments");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "TheCare patient backend is running"
    });
});

app.get("/api/db-check", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                current_database() AS database,
                NOW() AS server_time
        `);

        res.json({
            success: true,
            message: "PostgreSQL connection successful",
            database: result.rows[0].database,
            serverTime: result.rows[0].server_time
        });
    } catch (error) {
        console.error("Database check failed:", error.message);

        res.status(500).json({
            success: false,
            message: "PostgreSQL connection failed"
        });
    }
});

// Patient signup and login.
app.use("/api/auth", authRoutes);

// List active departments for the appointment form.
app.get("/api/departments", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, department_code, department_name
             FROM departments
             WHERE is_active = TRUE
             ORDER BY department_name`
        );

        res.json({
            success: true,
            departments: result.rows
        });
    } catch (error) {
        console.error("Get departments failed:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load departments.",
            debug: {
                error: error.message,
                code: error.code,
                detail: error.detail
            }
        });
    } 
});

// Patient appointment management.
app.use("/api/appointments", appointmentRoutes);

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});