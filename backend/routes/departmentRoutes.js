const express = require("express");
const router = express.Router();

const pool = require("../config/database");


/* ============================================================
   GET ALL DEPARTMENTS
   GET /api/departments
   ============================================================ */

router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                department_code,
                department_name,
                is_active
            FROM departments
            WHERE is_active = TRUE
            ORDER BY id
        `);

        res.json({
            success: true,
            departments: result.rows
        });

    } catch (error) {
        console.error("GET /api/departments error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve departments"
        });
    }
});


module.exports = router;