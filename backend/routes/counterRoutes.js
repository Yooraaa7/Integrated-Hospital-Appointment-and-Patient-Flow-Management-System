const express = require("express");
const router = express.Router();

const pool = require("../config/database");


/* ============================================================
   GET COUNTERS
   GET /api/counters

   Optional:
   /api/counters?department_id=1
   ============================================================ */

router.get("/", async (req, res) => {
    try {
        const { department_id } = req.query;

        let query = `
            SELECT
                c.id,
                c.counter_number,
                c.department_id,
                d.department_code,
                d.department_name,
                c.is_active
            FROM counters c
            JOIN departments d
                ON d.id = c.department_id
            WHERE c.is_active = TRUE
        `;

        const values = [];

        if (department_id) {
            values.push(department_id);
            query += ` AND c.department_id = $1`;
        }

        query += `
            ORDER BY
                c.department_id,
                c.counter_number
        `;

        const result = await pool.query(query, values);

        res.json({
            success: true,
            counters: result.rows
        });

    } catch (error) {
        console.error("GET /api/counters error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve counters"
        });
    }
});


module.exports = router;