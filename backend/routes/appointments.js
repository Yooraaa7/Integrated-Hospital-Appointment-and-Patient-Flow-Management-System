const express = require("express");
const pool = require("../db");
const { requirePatient } = require("../middleware/patientAuth");

const router = express.Router();

// All appointment endpoints require patient authentication.
router.use(requirePatient);

function parseFutureDate(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        return null;
    }

    return date;
}

// GET /api/appointments
// Retrieve only the logged-in patient's appointments.
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                a.id,
                a.external_appointment_id,
                a.patient_id,
                a.department_id,
                a.doctor_id,
                a.scheduled_at,
                a.status,
                a.notes,
                a.created_at,
                a.updated_at,
                d.department_code,
                d.department_name
             FROM appointments a
             JOIN departments d ON d.id = a.department_id
             WHERE a.patient_id = $1
             ORDER BY a.scheduled_at DESC`,
            [req.patient.id]
        );

        return res.json({
            success: true,
            appointments: result.rows
        });
    } catch (error) {
        console.error("Get appointments failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to load appointments."
        });
    }
});

// POST /api/appointments
// Create a confirmed appointment in PostgreSQL.
router.post("/", async (req, res) => {
    try {
        const {
            department_id,
            doctor_id,
            scheduled_at,
            notes
        } = req.body;

        const departmentId = Number(department_id);
        const scheduledAt = parseFutureDate(scheduled_at);

        if (!Number.isSafeInteger(departmentId) || departmentId <= 0) {
            return res.status(400).json({
                success: false,
                message: "A valid department is required."
            });
        }

        if (!scheduledAt) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid future appointment date and time."
            });
        }

        const doctorId =
            doctor_id === undefined ||
            doctor_id === null ||
            String(doctor_id).trim() === ""
                ? null
                : String(doctor_id).trim();

        if (doctorId && doctorId.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Invalid doctor ID."
            });
        }

        const appointmentNotes =
            notes === undefined || notes === null
                ? ""
                : typeof notes === "string"
                    ? notes.trim()
                    : null;

        if (appointmentNotes === null) {
            return res.status(400).json({
                success: false,
                message: "Appointment notes must be valid text."
            });
        }

        if (appointmentNotes.length > 2000) {
            return res.status(400).json({
                success: false,
                message: "Appointment notes cannot exceed 2000 characters."
            });
        }

        const departmentResult = await pool.query(
            `SELECT id, department_code, department_name
             FROM departments
             WHERE id = $1 AND is_active = TRUE`,
            [departmentId]
        );

        if (departmentResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "The selected department is unavailable."
            });
        }

        // Prevent the same patient from booking the exact same time twice.
        const duplicateResult = await pool.query(
            `SELECT id
             FROM appointments
             WHERE patient_id = $1
               AND scheduled_at = $2
               AND status IN ('BOOKED', 'CONFIRMED')
             LIMIT 1`,
            [req.patient.id, scheduledAt]
        );

        if (duplicateResult.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "You already have an appointment at this time."
            });
        }

        const result = await pool.query(
            `INSERT INTO appointments (
                patient_id,
                department_id,
                doctor_id,
                scheduled_at,
                notes,
                status
            )
            VALUES ($1, $2, $3, $4, $5, 'CONFIRMED')
            RETURNING
                id,
                patient_id,
                department_id,
                doctor_id,
                scheduled_at,
                notes,
                status,
                created_at,
                updated_at`,
            [
                req.patient.id,
                departmentId,
                doctorId,
                scheduledAt,
                appointmentNotes
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Appointment created successfully.",
            appointment: {
                ...result.rows[0],
                department_code:
                    departmentResult.rows[0].department_code,
                department_name:
                    departmentResult.rows[0].department_name
            }
        });
    } catch (error) {
        console.error("Create appointment failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to create appointment."
        });
    }
});


router.put("/:id/reschedule", async (req, res) => {
    const appointmentId = Number(req.params.id);
    const scheduledAt = parseFutureDate(req.body?.scheduled_at);

    const notes =
        req.body?.notes === undefined || req.body?.notes === null
            ? ""
            : typeof req.body.notes === "string"
                ? req.body.notes.trim()
                : null;

    if (!Number.isSafeInteger(appointmentId) || appointmentId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid appointment ID."
        });
    }

    if (!scheduledAt) {
        return res.status(400).json({
            success: false,
            message: "Please select a valid future appointment date and time."
        });
    }

    if (notes === null) {
        return res.status(400).json({
            success: false,
            message: "Appointment notes must be valid text."
        });
    }

    if (notes.length > 2000) {
        return res.status(400).json({
            success: false,
            message: "Appointment notes cannot exceed 2000 characters."
        });
    }

    try {
        const appointmentResult = await pool.query(
            `SELECT id, status
             FROM appointments
             WHERE id = $1 AND patient_id = $2`,
            [appointmentId, req.patient.id]
        );

        if (appointmentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found."
            });
        }

        const appointment = appointmentResult.rows[0];

        if (!["BOOKED", "CONFIRMED"].includes(appointment.status)) {
            return res.status(409).json({
                success: false,
                message: "This appointment cannot be rescheduled."
            });
        }

        // Do not silently change an appointment that already has a QMS ticket.
        const queueResult = await pool.query(
            `SELECT id
             FROM queues
             WHERE appointment_id = $1
             LIMIT 1`,
            [appointmentId]
        );

        if (queueResult.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This appointment already has a queue ticket. Please contact staff before rescheduling."
            });
        }

        const duplicateResult = await pool.query(
            `SELECT id
             FROM appointments
             WHERE patient_id = $1
               AND scheduled_at = $2
               AND status IN ('BOOKED', 'CONFIRMED')
               AND id <> $3
             LIMIT 1`,
            [req.patient.id, scheduledAt, appointmentId]
        );

        if (duplicateResult.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "You already have an appointment at this time."
            });
        }

        const result = await pool.query(
            `UPDATE appointments
             SET scheduled_at = $1,
                 notes = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 AND patient_id = $4
             RETURNING
                id,
                patient_id,
                department_id,
                doctor_id,
                scheduled_at,
                notes,
                status,
                updated_at`,
            [scheduledAt, notes, appointmentId, req.patient.id]
        );

        return res.json({
            success: true,
            message: "Appointment rescheduled successfully.",
            appointment: result.rows[0]
        });
    } catch (error) {
        console.error("Reschedule appointment failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to reschedule appointment."
        });
    }
});




/* =========================
   REGISTER APPOINTMENT ARRIVAL
========================= */

router.post("/:id/register", async (req, res) => {
    const appointmentId = Number(req.params.id);
    const patientId = req.patient.id;

    if (!Number.isSafeInteger(appointmentId) || appointmentId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid appointment ID."
        });
    }

    const client = await pool.connect();
    let transactionStarted = false;

    try {
        await client.query("BEGIN");
        transactionStarted = true;

        // Lock this appointment to prevent simultaneous registrations.
        const appointmentResult = await client.query(
            `SELECT
                a.id,
                a.patient_id,
                a.department_id,
                a.doctor_id,
                a.scheduled_at,
                a.status,
                d.department_code,
                d.department_name
             FROM appointments a
             JOIN departments d ON d.id = a.department_id
             WHERE a.id = $1
               AND a.patient_id = $2
             FOR UPDATE OF a`,
            [appointmentId, patientId]
        );

        if (appointmentResult.rows.length === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Appointment not found."
            });
        }

        const appointment = appointmentResult.rows[0];

        // Check whether this appointment already has a queue.
        const existingQueueResult = await client.query(
            `SELECT id, queue_number, appointment_id, patient_id,
                    department_id, queue_type, priority, status,
                    scheduled_at, issued_at, tracking_token
             FROM queues
             WHERE appointment_id = $1
             LIMIT 1`,
            [appointmentId]
        );

        if (existingQueueResult.rows.length > 0) {
            const existingQueue = existingQueueResult.rows[0];

            if (
                ["CANCELLED", "COMPLETED"].includes(existingQueue.status)
            ) {
                await client.query("ROLLBACK");
                transactionStarted = false;

                return res.status(400).json({
                    success: false,
                    message: "This appointment's queue is already closed."
                });
            }

            if (appointment.status !== "CHECKED_IN") {
                await client.query(
                    `UPDATE appointments
                     SET status = 'CHECKED_IN',
                         updated_at = NOW()
                     WHERE id = $1`,
                    [appointmentId]
                );
            }

            await client.query("COMMIT");
            transactionStarted = false;

            return res.json({
                success: true,
                message: "This appointment has already been registered.",
                appointment: {
                    id: appointment.id,
                    status: "CHECKED_IN"
                },
                queue: existingQueue
            });
        }

        if (!["CONFIRMED", "BOOKED"].includes(appointment.status)) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(400).json({
                success: false,
                message: "This appointment cannot be registered."
            });
        }

        // Allow registration starting 15 minutes before the appointment.
        const scheduledAt = new Date(appointment.scheduled_at);

        if (Number.isNaN(scheduledAt.getTime())) {
            await client.query("ROLLBACK");

            return res.status(500).json({
                success: false,
                message: "Invalid appointment date and time."
            });
        }

        const registrationOpensAt = new Date(
            scheduledAt.getTime() - 15 * 60 * 1000
        );

        if (new Date() < registrationOpensAt) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Registration opens 15 minutes before your appointment."
            });
        }

        // Lock the department counter before allocating a number.
        const counterResult = await client.query(
            `SELECT next_appointment_number
             FROM department_queue_counters
             WHERE department_id = $1
             FOR UPDATE`,
            [appointment.department_id]
        );

        if (counterResult.rows.length === 0) {
            throw new Error(
                `Appointment queue counter is missing for department ${appointment.department_id}.`
            );
        }

        const nextNumber = Number(
            counterResult.rows[0].next_appointment_number
        );

        if (!Number.isSafeInteger(nextNumber) || nextNumber < 1) {
            throw new Error("Invalid next appointment queue number.");
        }

        const queueNumber =
            `AP-${appointment.department_code}` +
            String(nextNumber).padStart(2, "0");

        // Allocate the number and create the queue in the same transaction.
        await client.query(
            `UPDATE department_queue_counters
             SET next_appointment_number = next_appointment_number + 1,
                 updated_at = NOW()
             WHERE department_id = $1`,
            [appointment.department_id]
        );

        const queueResult = await client.query(
            `INSERT INTO queues (
                queue_number,
                patient_id,
                appointment_id,
                department_id,
                queue_type,
                priority,
                status,
                scheduled_at,
                issued_at,
                last_action_at,
                created_at,
                updated_at
             )
             VALUES (
                $1, $2, $3, $4,
                'APPOINTMENT', 1, 'WAIT',
                $5, NOW(), NOW(), NOW(), NOW()
             )
             RETURNING
                id, queue_number, patient_id, appointment_id,
                department_id, queue_type, priority, status,
                scheduled_at, issued_at, tracking_token`,
            [
                queueNumber,
                patientId,
                appointmentId,
                appointment.department_id,
                appointment.scheduled_at
            ]
        );

        // Update the appointment only after its queue has been created.
        const updatedAppointmentResult = await client.query(
            `UPDATE appointments
             SET status = 'CHECKED_IN',
                 updated_at = NOW()
             WHERE id = $1
             RETURNING id, patient_id, department_id,
                       scheduled_at, status, updated_at`,
            [appointmentId]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: "Appointment registered successfully.",
            appointment: updatedAppointmentResult.rows[0],
            queue: queueResult.rows[0]
        });

    } catch (error) {
        if (transactionStarted) {
            await client.query("ROLLBACK");
        }

        console.error("Appointment registration failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to register this appointment."
        });
    } finally {
        client.release();
    }
});



// PATCH /api/appointments/:id/cancel
// Cancel an appointment owned by the logged-in patient.
router.patch("/:id/cancel", async (req, res) => {
    const appointmentId = Number(req.params.id);

    if (!Number.isSafeInteger(appointmentId) || appointmentId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid appointment ID."
        });
    }

    try {
        const appointmentResult = await pool.query(
            `SELECT id, status
             FROM appointments
             WHERE id = $1 AND patient_id = $2`,
            [appointmentId, req.patient.id]
        );

        if (appointmentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found."
            });
        }

        const appointment = appointmentResult.rows[0];

        if (!["BOOKED", "CONFIRMED"].includes(appointment.status)) {
            return res.status(409).json({
                success: false,
                message: "This appointment cannot be cancelled."
            });
        }

        // Keep the appointment and QMS queue consistent.
        const queueResult = await pool.query(
            `SELECT id
             FROM queues
             WHERE appointment_id = $1
             LIMIT 1`,
            [appointmentId]
        );

        if (queueResult.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This appointment already has a queue ticket. Please contact staff before cancelling."
            });
        }

        const result = await pool.query(
            `UPDATE appointments
             SET status = 'CANCELLED',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND patient_id = $2
             RETURNING id, status, updated_at`,
            [appointmentId, req.patient.id]
        );

        return res.json({
            success: true,
            message: "Appointment cancelled successfully.",
            appointment: result.rows[0]
        });
    } catch (error) {
        console.error("Cancel appointment failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to cancel appointment."
        });
    }
});

module.exports = router;