const express = require("express");
const router = express.Router();

const pool = require("../config/database");
const {requireStaff}=require("../middleware/auth");


router.post("/", requireStaff, async (req, res) => {
    try {
        const {
            patient_number,
            full_name,
            phone_number,
            email,
            date_of_birth
        } = req.body;

        if (!patient_number || !full_name) {
            return res.status(400).json({
                success: false,
                message: "Patient number and full name are required"
            });
        }

        const result = await pool.query(
            `
            INSERT INTO patients (
                patient_number,
                full_name,
                phone_number,
                email,
                date_of_birth
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            `,
            [
                patient_number,
                full_name,
                phone_number || null,
                email || null,
                date_of_birth || null
            ]
        );

        res.status(201).json({
            success: true,
            patient: result.rows[0]
        });

    } catch (error) {
        console.error("POST /api/patients error:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Patient number already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to create patient"
        });
    }
});


module.exports = router;