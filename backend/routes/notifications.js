
const express = require("express");
const pool = require("../db");
const { requirePatient } = require("../middleware/patientAuth");

const router = express.Router();

// All notification endpoints require patient authentication.
router.use(requirePatient);


// GET /api/notifications
// Retrieve the logged-in patient's notification history.
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                id,
                appointment_id,
                notification_type,
                title,
                message,
                detail,
                is_read,
                created_at
             FROM patient_notifications
             WHERE patient_id = $1
             ORDER BY created_at DESC, id DESC`,
            [req.patient.id]
        );

        const unreadCount = result.rows.filter(
            notification => !notification.is_read
        ).length;

        return res.json({
            success: true,
            notifications: result.rows,
            unreadCount
        });

    } catch (error) {
        console.error("Get notifications failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to load notifications."
        });
    }
});


// PATCH /api/notifications/read-all
// Mark all notifications belonging to this patient as read.
router.patch("/read-all", async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE patient_notifications
             SET is_read = TRUE
             WHERE patient_id = $1
               AND is_read = FALSE
             RETURNING id`,
            [req.patient.id]
        );

        return res.json({
            success: true,
            message: "Notifications marked as read.",
            updatedCount: result.rowCount
        });

    } catch (error) {
        console.error("Mark notifications as read failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to update notifications."
        });
    }
});

module.exports = router;
