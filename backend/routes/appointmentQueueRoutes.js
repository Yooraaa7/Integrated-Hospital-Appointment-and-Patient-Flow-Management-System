const express = require("express");
const router = express.Router();

const pool = require("../config/database");
const { requireStaff } = require("../middleware/auth");

const {
    generateAppointmentNumber
} = require("../services/appointmentQueueService");

// POST /api/appointment-queues/register
router.post("/register", requireStaff, async (req, res) => {

    const appointmentId = Number(req.body?.appointment_id);

    if (
        !Number.isSafeInteger(appointmentId) ||
        appointmentId <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Valid appointment ID required"
        });
    }

    let client;

    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Lock the appointment to prevent duplicate registration.
        const appointmentResult = await client.query(
            `
            SELECT
                a.id,
                a.patient_id,
                a.department_id,
                a.scheduled_at,
                a.status
            FROM appointments a
            WHERE a.id = $1
            FOR UPDATE
            `,
            [appointmentId]
        );

        if (appointmentResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Appointment not found"
            });
        }

        const appointment = appointmentResult.rows[0];

        // Return the existing ticket if already registered.
        const existingResult = await client.query(
            `
            SELECT
                id,
                queue_number,
                appointment_id,
                queue_type,
                priority,
                status,
                scheduled_at
            FROM queues
            WHERE appointment_id = $1
            LIMIT 1
            `,
            [appointmentId]
        );

        if (existingResult.rows.length > 0) {
            await client.query("COMMIT");

            return res.json({
                success: true,
                existing: true,
                message: "Appointment already registered",
                queue: existingResult.rows[0]
            });
        }

        // Only confirmed appointments are eligible.
        if (appointment.status !== "CONFIRMED") {
            await client.query("ROLLBACK");

            return res.status(409).json({
                success: false,
                message: "Appointment is not confirmed"
            });
        }

        // Registration must happen on the booked date
        // using the Malaysian calendar date.
        const dateCheck = await client.query(
            `
            SELECT
                (
                    $1::timestamptz
                    AT TIME ZONE 'Asia/Kuala_Lumpur'
                )::date
                =
                (
                    NOW()
                    AT TIME ZONE 'Asia/Kuala_Lumpur'
                )::date
                AS same_day
            `,
            [appointment.scheduled_at]
        );

        if (!dateCheck.rows[0].same_day) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                success: false,
                message:
                    "Appointment can only be registered " +
                    "on its scheduled date"
            });
        }

        // Generate AP-CD01, AP-CD02, etc.
        const queueNumber = await generateAppointmentNumber(
            client,
            appointment.department_id
        );

        // Store ticket in the existing QMS queues table.
        const queueResult = await client.query(
            `
            INSERT INTO queues (
                patient_id,
                appointment_id,
                department_id,
                queue_number,
                queue_type,
                priority,
                status,
                scheduled_at
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                'APPOINTMENT',
                1,
                'WAIT',
                $5
            )
            RETURNING
                id,
                queue_number,
                appointment_id,
                patient_id,
                department_id,
                queue_type,
                priority,
                status,
                scheduled_at
            `,
            [
                appointment.patient_id,
                appointment.id,
                appointment.department_id,
                queueNumber,
                appointment.scheduled_at
            ]
        );

        await client.query("COMMIT");

        return res.status(201).json({
            success: true,
            existing: false,
            message: "Appointment queue created",
            queue: queueResult.rows[0]
        });

    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Rollback failed:", rollbackError);
            }
        }

        console.error("Appointment queue error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to register appointment queue"
        });

    } finally {
        if (client) {
            client.release();
        }
    }
});

module.exports = router;
