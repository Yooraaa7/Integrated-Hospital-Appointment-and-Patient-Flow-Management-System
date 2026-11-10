
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
}

function normalizeIC(value) {
    return String(value || "").replace(/[^0-9]/g, "");
}

function isValidIC(value) {
    return /^\d{12}$/.test(normalizeIC(value));
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        String(value || "").trim()
    );
}

function isStrongPassword(password) {
    return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    );
}

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
    try {
        const {
            full_name,
            identifier,
            password,
            date_of_birth
        } = req.body || {};

        const fullName = String(full_name || "").trim();
        const input = String(identifier || "").trim();
        const dateOfBirth = String(date_of_birth || "").trim();

        const email = isValidEmail(input)
            ? input.toLowerCase()
            : null;

        const icNumber = isValidIC(input)
            ? normalizeIC(input)
            : null;

        if (!fullName || !input || !password || !dateOfBirth) {
            return res.status(400).json({
                success: false,
                message: "Please complete all required fields."
            });
        }

        if (!email && !icNumber) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address or 12-digit IC number."
            });
        }

        if (!isStrongPassword(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters and contain an uppercase letter, a number and a special character."
            });
        }

        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
            Number.isNaN(Date.parse(dateOfBirth)) ||
            dateOfBirth > new Date().toISOString().slice(0, 10)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid date of birth."
            });
        }

        const existing = await pool.query(
            `SELECT id
             FROM patients
             WHERE ($1::varchar IS NOT NULL AND LOWER(email) = $1)
                OR ($2::varchar IS NOT NULL AND ic_number = $2)
             LIMIT 1`,
            [email, icNumber]
        );

        if (existing.rowCount > 0) {
            return res.status(409).json({
                success: false,
                message: "An account with this email or IC number already exists."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `WITH next_patient AS (
                SELECT nextval(
                    'public.patients_id_seq'::regclass
                ) AS id
            )
            INSERT INTO patients (
                id,
                patient_number,
                full_name,
                email,
                date_of_birth,
                ic_number,
                password_hash,
                is_active
            )
            SELECT
                id,
                'PAT' || CASE
                    WHEN id < 1000000
                    THEN LPAD(id::text, 6, '0')
                    ELSE id::text
                END,
                $1,
                $2,
                $3,
                $4,
                $5,
                TRUE
            FROM next_patient
            RETURNING
                id,
                patient_number,
                full_name,
                email,
                date_of_birth`,
            [
                fullName,
                email,
                dateOfBirth,
                icNumber,
                passwordHash
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Patient registration successful.",
            patient: result.rows[0]
        });
    } catch (error) {
        console.error("Patient signup failed:", error.message);

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "This patient number, email or IC number is already registered."
            });
        }

        if (error.code === "22007" || error.code === "22008") {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid date of birth."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Registration failed. Please try again."
        });
    }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { identifier, password } = req.body || {};
        const input = String(identifier || "").trim();

        const email = isValidEmail(input)
            ? input.toLowerCase()
            : null;

        const icNumber = isValidIC(input)
            ? normalizeIC(input)
            : null;

        if (!input || !password) {
            return res.status(400).json({
                success: false,
                message: "Email or IC number and password are required."
            });
        }

        if (!email && !icNumber) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address or 12-digit IC number."
            });
        }

        const result = await pool.query(
            `SELECT
                id,
                patient_number,
                full_name,
                email,
                date_of_birth,
                password_hash,
                is_active
             FROM patients
             WHERE ($1::varchar IS NOT NULL AND LOWER(email) = $1)
                OR ($2::varchar IS NOT NULL AND ic_number = $2)
             LIMIT 1`,
            [email, icNumber]
        );

        const patient = result.rows[0];

        if (
            !patient ||
            !patient.is_active ||
            !patient.password_hash ||
            !(await bcrypt.compare(password, patient.password_hash))
        ) {
            return res.status(401).json({
                success: false,
                message: "Incorrect email / IC number or password."
            });
        }

        const token = jwt.sign(
            {
                sub: String(patient.id),
                patientNumber: patient.patient_number,
                role: "patient"
            },
            JWT_SECRET,
            { expiresIn: "2h" }
        );

        return res.json({
            success: true,
            message: "Login successful.",
            token,
            patient: {
                id: patient.id,
                patient_number: patient.patient_number,
                full_name: patient.full_name,
                email: patient.email,
                date_of_birth: patient.date_of_birth
            }
        });
    } catch (error) {
        console.error("========== PATIENT LOGIN ERROR ==========");
        console.error("Error object:", error);
        console.error("Error type:", typeof error);
        console.error("Error message:", error?.message);
        console.error("Error stack:", error?.stack);
        console.error("==========================================");

        return res.status(500).json({
            success: false,
            message: "Login failed. Please try again."
        });
    }
});

module.exports = router;
