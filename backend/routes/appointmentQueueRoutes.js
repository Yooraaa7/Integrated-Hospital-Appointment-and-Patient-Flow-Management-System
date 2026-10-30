const express = require("express");
const router = express.Router();

const pool = require("../config/database");

const { requireStaff } = require("../middleware/auth");
const { requirePatientJwt } = require("../middleware/patientJwtAuth");

const {
    generateAppointmentNumber
} = require("../services/appointmentQueueService");

async function registerAppointmentQueue(req, res, patientOnly) {

    const appointmentId = String(
        req.body?.appointment_id ?? ""
    ).trim();

    if (!/^[1-9]\d*$/.test(appointmentId)) {
        return res.status(400).json({
            success: false,
            code: "INVALID_APPOINTMENT_ID",
            message: "A valid appointment_id is required."
        });
    }

    const patientId = patientOnly
        ? req.patient.id
        : null;

    let client;

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        const appointmentQuery = patientOnly
            ? `
                SELECT
                    a.id,
                    a.patient_id,
                    a.department_id,
                    a.scheduled_at,
                    a.status
                FROM appointments a
                WHERE a.id = $1
                  AND a.patient_id = $2
                FOR UPDATE OF a
            `
            : `
                SELECT
                    a.id,
                    a.patient_id,
                    a.department_id,
                    a.scheduled_at,
                    a.status
                FROM appointments a
                WHERE a.id = $1
                FOR UPDATE OF a
            `;

        const appointmentParams = patientOnly
            ? [appointmentId, patientId]
            : [appointmentId];

        const appointmentResult = await client.query(
            appointmentQuery,
            appointmentParams
        );

        // For patient requests, this also covers an
        // appointment that belongs to somebody else.
        if (appointmentResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                code: "APPOINTMENT_NOT_FOUND",
                message: "Appointment not found."
            });
        }

        const appointment = appointmentResult.rows[0];

        const existingResult = await client.query(
            `
            SELECT
                id,
                queue_number,
                appointment_id,
                patient_id,
                department_id,
                queue_type,
                priority,
                status,
                scheduled_at,
                issued_at
            FROM queues
            WHERE appointment_id = $1
            LIMIT 1
            `,
            [appointmentId]
        );

        if (existingResult.rows.length > 0) {

            const ownershipFilter = patientOnly
                ? "AND patient_id = $2"
                : "";

            const updateParams = patientOnly
                ? [appointmentId, patientId]
                : [appointmentId];

            const statusResult = await client.query(
                `
                UPDATE appointments
                SET
                    status = 'CHECKED_IN',
                    updated_at = NOW()
                WHERE id = $1
                  ${ownershipFilter}
                  AND status = 'CONFIRMED'
                RETURNING id, status
                `,
                updateParams
            );

            const finalStatus =
                statusResult.rows[0]?.status ??
                appointment.status;

            await client.query("COMMIT");

            return res.status(200).json({
                success: true,
                existing: true,
                message: "Appointment already registered.",
                appointment: {
                    id: appointment.id,
                    status: finalStatus
                },
                queue: existingResult.rows[0]
            });
        }


        if (appointment.status !== "CONFIRMED") {
            await client.query("ROLLBACK");

            return res.status(409).json({
                success: false,
                code: "APPOINTMENT_NOT_CONFIRMED",
                message: "Only confirmed appointments can be registered."
            });
        }


        const windowResult = await client.query(
            `
            SELECT
                NOW() >=
                    $1::timestamptz - INTERVAL '15 minutes'
                    AS registration_open,

                (
                    $1::timestamptz - INTERVAL '15 minutes'
                ) AS registration_opens_at
            `,
            [appointment.scheduled_at]
        );


        const registrationWindow = windowResult.rows[0];

        if (!registrationWindow.registration_open) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                success: false,
                code: "REGISTRATION_NOT_OPEN",
                message: "Registration opens 15 minutes before the appointment time.",
                registration_opens_at:
                    registrationWindow.registration_opens_at
            });
        }


        const queueNumber = await generateAppointmentNumber(
            client,
            appointment.department_id
        );


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
                scheduled_at,
                issued_at
            `,
            [
                appointment.patient_id,
                appointment.id,
                appointment.department_id,
                queueNumber,
                appointment.scheduled_at
            ]
        );


        const ownershipFilter = patientOnly
            ? "AND patient_id = $2"
            : "";

        const updateParams = patientOnly
            ? [appointmentId, patientId]
            : [appointmentId];

        const appointmentUpdate = await client.query(
            `
            UPDATE appointments
            SET
                status = 'CHECKED_IN',
                updated_at = NOW()
            WHERE id = $1
              ${ownershipFilter}
              AND status = 'CONFIRMED'
            RETURNING id, status
            `,
            updateParams
        );

        if (appointmentUpdate.rows.length === 0) {
            throw new Error(
                "Appointment status could not be updated to CHECKED_IN."
            );
        }


        await client.query("COMMIT");

        return res.status(201).json({
            success: true,
            existing: false,
            message: "Appointment queue created successfully.",
            appointment: appointmentUpdate.rows[0],
            queue: queueResult.rows[0]
        });

    } catch (error) {

        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error(
                    "Appointment queue rollback failed:",
                    rollbackError.message
                );
            }
        }

        
        if (error.code === "23505") {
            try {
                const duplicateResult = patientOnly
                    ? await pool.query(
                        `
                        SELECT
                            q.id,
                            q.queue_number,
                            q.appointment_id,
                            q.patient_id,
                            q.department_id,
                            q.queue_type,
                            q.priority,
                            q.status,
                            q.scheduled_at,
                            q.issued_at
                        FROM queues q
                        JOIN appointments a
                          ON a.id = q.appointment_id
                        WHERE q.appointment_id = $1
                          AND a.patient_id = $2
                        LIMIT 1
                        `,
                        [appointmentId, patientId]
                    )
                    : await pool.query(
                        `
                        SELECT
                            id,
                            queue_number,
                            appointment_id,
                            patient_id,
                            department_id,
                            queue_type,
                            priority,
                            status,
                            scheduled_at,
                            issued_at
                        FROM queues
                        WHERE appointment_id = $1
                        LIMIT 1
                        `,
                        [appointmentId]
                    );

                if (duplicateResult.rows.length > 0) {
                    return res.status(200).json({
                        success: true,
                        existing: true,
                        message: "Appointment already registered.",
                        queue: duplicateResult.rows[0]
                    });
                }

            } catch (duplicateError) {
                console.error(
                    "Could not retrieve existing appointment queue:",
                    duplicateError.message
                );
            }
        }

        console.error(
            "Appointment queue registration error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            code: "REGISTRATION_FAILED",
            message: "Unable to register appointment queue."
        });

    } finally {
        if (client) {
            client.release();
        }
    }
}


// =====================================================
// POST /api/appointment-queues/register
//
// Existing staff workflow.
// Continues to require the QMS staff JWT.
// =====================================================

router.post("/register", requireStaff, (req, res) => {
    return registerAppointmentQueue(req, res, false);
});


// =====================================================
// POST /api/appointment-queues/patient-register
//
// New patient workflow.
// Requires the patient JWT.
// =====================================================

router.post("/patient-register", requirePatientJwt, (req, res) => {
    return registerAppointmentQueue(req, res, true);
});


module.exports = router;