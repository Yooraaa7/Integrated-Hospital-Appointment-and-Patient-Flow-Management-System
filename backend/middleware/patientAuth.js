const jwt = require("jsonwebtoken");
const pool = require("../db");

async function requirePatient(req, res, next) {
    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            success: false,
            message: "Please log in to access your appointments."
        });
    }

    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is missing.");

        return res.status(500).json({
            success: false,
            message: "Authentication is not configured."
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "patient" || !decoded.sub) {
            return res.status(403).json({
                success: false,
                message: "Patient access is required."
            });
        }

        const patientId = Number(decoded.sub);

        if (!Number.isSafeInteger(patientId) || patientId <= 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid patient account."
            });
        }

        const result = await pool.query(
            `SELECT id, patient_number, full_name, email, is_active
             FROM patients
             WHERE id = $1
             LIMIT 1`,
            [patientId]
        );

        if (result.rows.length === 0 || !result.rows[0].is_active) {
            return res.status(401).json({
                success: false,
                message: "Patient account not found or inactive."
            });
        }

        const patient = result.rows[0];

        req.patient = {
            id: patient.id,
            patientNumber: patient.patient_number,
            fullName: patient.full_name,
            email: patient.email
        };

        next();
    } catch (error) {
        if (
            error.name === "TokenExpiredError" ||
            error.name === "JsonWebTokenError"
        ) {
            return res.status(401).json({
                success: false,
                message: "Your login session is invalid or expired. Please log in again."
            });
        }

        console.error("Patient authentication failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to verify your patient account."
        });
    }
}

module.exports = { requirePatient };