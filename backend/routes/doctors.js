
const express = require("express");
const pool = require("../db");

const router = express.Router();

/*
    Convert a database doctor row into a response
    containing the doctor's department and schedules.
*/
const DOCTOR_QUERY = `
    SELECT
        d.doctor_id,
        d.full_name,
        d.department_id,
        dep.department_code,
        dep.department_name,
        d.specialty,
        d.phone,
        d.email,
        d.qualifications,
        d.years_of_experience,
        d.languages,
        d.consultation_room,
        d.photo_url,
        d.bio,
        d.is_active,

        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'day_of_week', h.day_of_week,
                    'is_working', h.is_working,
                    'slot_minutes', h.slot_minutes,
                    'morning_start', h.morning_start,
                    'morning_end', h.morning_end,
                    'afternoon_start', h.afternoon_start,
                    'afternoon_end', h.afternoon_end
                )
                ORDER BY h.day_of_week
            ) FILTER (WHERE h.id IS NOT NULL),
            '[]'::jsonb
        ) AS schedules

    FROM doctors d

    JOIN departments dep
        ON dep.id = d.department_id

    LEFT JOIN doctor_consultation_hours h
        ON h.doctor_id = d.doctor_id

    WHERE d.is_active = TRUE
      AND dep.is_active = TRUE
`;


/*
    GET /api/doctors

    Retrieve all active doctors.

    Optional:
    /api/doctors?department_id=2
*/
router.get("/", async (req, res) => {
    try {
        const departmentId =
            req.query.department_id === undefined
                ? null
                : Number(req.query.department_id);

        if (
            departmentId !== null &&
            (!Number.isSafeInteger(departmentId) || departmentId <= 0)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid department ID."
            });
        }

        const result = await pool.query(
            `${DOCTOR_QUERY}
             AND ($1::bigint IS NULL OR d.department_id = $1)
             GROUP BY d.doctor_id, dep.id
             ORDER BY dep.department_name, d.full_name`,
            [departmentId]
        );

        return res.json({
            success: true,
            total: result.rows.length,
            doctors: result.rows
        });

    } catch (error) {
        console.error("Get doctors failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load doctors."
        });
    }
});


/*
    GET /api/doctors/:doctorId

    Retrieve one doctor's details and consultation schedule.
*/
router.get("/:doctorId", async (req, res) => {
    try {
        const doctorId = String(req.params.doctorId || "").trim();

        if (!doctorId || doctorId.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Invalid doctor ID."
            });
        }

        const result = await pool.query(
            `${DOCTOR_QUERY}
             AND d.doctor_id = $1
             GROUP BY d.doctor_id, dep.id`,
            [doctorId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found."
            });
        }

        return res.json({
            success: true,
            doctor: result.rows[0]
        });

    } catch (error) {
        console.error("Get doctor details failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load doctor details."
        });
    }
});

module.exports = router;
