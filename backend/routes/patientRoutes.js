
const express = require("express");
const pool = require("../db");
const { requirePatient } = require("../middleware/patientAuth");

const router = express.Router();

// GET /api/patients/profile
// Retrieve the logged-in patient's profile.
router.get("/profile", requirePatient, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                id,
                patient_number,
                full_name,
                email,
                date_of_birth::text AS date_of_birth,
                ic_number
             FROM patients
             WHERE id = $1
               AND is_active = TRUE
             LIMIT 1`,
            [req.patient.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found."
            });
        }

        return res.json({
            success: true,
            patient: result.rows[0]
        });

    } catch (error) {
        console.error("Get patient profile failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve patient profile."
        });
    }
});


// PUT /api/patients/profile
// Update the logged-in patient's profile.
router.put("/profile", requirePatient, async (req, res) => {
    try {
        const fullName =
            typeof req.body.full_name === "string"
                ? req.body.full_name.trim()
                : "";

        const email =
            typeof req.body.email === "string"
                ? req.body.email.trim().toLowerCase() || null
                : null;

        const icNumber =
            typeof req.body.ic_number === "string"
                ? req.body.ic_number.replace(/\D/g, "") || null
                : null;

        const dateOfBirth =
            typeof req.body.date_of_birth === "string" &&
            req.body.date_of_birth.trim() !== ""
                ? req.body.date_of_birth.trim()
                : null;

        // Validate full name.
        if (!fullName) {
            return res.status(400).json({
                success: false,
                message: "Full name is required."
            });
        }

        // Require at least one login identifier.
        if (!email && !icNumber) {
            return res.status(400).json({
                success: false,
                message: "Please provide an email address or IC number."
            });
        }

        // Validate email format.
        if (
            email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        // Validate Malaysian IC number.
        if (icNumber && !/^\d{12}$/.test(icNumber)) {
            return res.status(400).json({
                success: false,
                message: "IC number must contain exactly 12 digits."
            });
        }

        // Validate date of birth format.
        if (
            dateOfBirth &&
            !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid date of birth."
            });
        }

        const result = await pool.query(
            `UPDATE patients
             SET
                full_name = $1,
                email = $2,
                ic_number = $3,
                date_of_birth = $4,
                updated_at = NOW()
             WHERE id = $5
               AND is_active = TRUE
                RETURNING
                    id,
                    patient_number,
                    full_name,
                    email,
                    ic_number,
                    date_of_birth::text AS date_of_birth`,
                [
                    fullName,
                    email,
                    icNumber,
                    dateOfBirth,
                    req.patient.id
                ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found."
            });
        }

        return res.json({
            success: true,
            message: "Profile updated successfully.",
            patient: result.rows[0]
        });

    } catch (error) {
        // Handle duplicate email or IC number.
        if (error.code === "23505") {
            if (error.constraint === "patients_email_unique") {
                return res.status(409).json({
                    success: false,
                    message: "This email address is already used by another patient."
                });
            }

            if (error.constraint === "patients_ic_number_key") {
                return res.status(409).json({
                    success: false,
                    message: "This IC number is already used by another patient."
                });
            }

            return res.status(409).json({
                success: false,
                message: "This information is already registered."
            });
        }

        console.error("Update patient profile failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to update patient profile."
        });
    }
});

module.exports = router;
