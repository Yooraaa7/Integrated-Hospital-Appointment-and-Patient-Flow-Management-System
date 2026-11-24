const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const pool = require("../config/database");
const { requireStaff } = require("../middleware/auth");

const router = express.Router();

const SESSION_DURATION_MS = 2 * 60 * 1000;

// =============================================
// STAFF LOGIN
// =============================================

router.post("/login", async (req, res) => {
    const {
        staff_id,
        password,
        department_id,
        counter_id
    } = req.body || {};

    if (
        !staff_id ||
        !password ||
        !Number.isInteger(Number(department_id)) ||
        !Number.isInteger(Number(counter_id))
    ) {
        return res.status(400).json({
            success: false,
            message: "All login fields are required"
        });
    }

    try {
        const result = await pool.query(
            `
            SELECT
                u.id,
                u.staff_id,
                u.full_name,
                u.password_hash,
                u.role,
                c.id AS counter_id,
                c.counter_number,
                c.department_id,
                d.department_name
            FROM users u
            JOIN counters c
                ON c.id = $2
                AND c.department_id = $3
                AND c.is_active = TRUE
            JOIN departments d
                ON d.id = c.department_id
                AND d.is_active = TRUE
            WHERE u.staff_id = $1
              AND u.is_active = TRUE
            `,
            [
                String(staff_id).trim().toUpperCase(),
                Number(counter_id),
                Number(department_id)
            ]
        );

        const user = result.rows[0];

        if (
            !user ||
            !user.password_hash ||
            !(await bcrypt.compare(password, user.password_hash))
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid staff credentials or counter"
            });
        }

        const role = user.role || "STAFF";

        if (!["STAFF", "ADMIN"].includes(role)) {
            return res.status(403).json({
                success: false,
                message: "Role is not permitted"
            });
        }

        // =====================================
        // RESERVE COUNTER
        // =====================================

        const sessionId = crypto.randomUUID();

        const reservation = await pool.query(
            `
            INSERT INTO counter_sessions (
                counter_id,
                user_id,
                session_id,
                created_at,
                last_seen_at,
                expires_at
            )
            VALUES (
                $1,
                $2,
                $3,
                NOW(),
                NOW(),
                NOW() + INTERVAL '2 minutes'
            )
            ON CONFLICT (counter_id)
            DO UPDATE SET
                user_id = EXCLUDED.user_id,
                session_id = EXCLUDED.session_id,
                created_at = NOW(),
                last_seen_at = NOW(),
                expires_at = NOW() + INTERVAL '2 minutes'
            WHERE counter_sessions.expires_at <= NOW()
            RETURNING counter_id
            `,
            [
                user.counter_id,
                user.id,
                sessionId
            ]
        );

        // Another staff member still owns this counter.
        if (reservation.rowCount === 0) {
            return res.status(409).json({
                success: false,
                message:
                    "This counter is currently occupied by another staff member. Please select another counter."
            });
        }

        // =====================================
        // CREATE JWT
        // =====================================

        const token = jwt.sign(
            {
                sub: String(user.id),
                staff_id: user.staff_id,
                role,
                counter_id: user.counter_id,
                department_id: user.department_id,
                counter_session_id: sessionId
            },
            process.env.JWT_SECRET,
            {
                algorithm: "HS256",
                expiresIn: "8h"
            }
        );

        return res.json({
            success: true,
            token,

            staff: {
                staff_id: user.staff_id,
                name: user.full_name,
                role,
                department: user.department_name,
                counter: `Counter ${user.counter_number}`,
                counter_id: user.counter_id,
                department_id: user.department_id
            }
        });

    } catch (error) {
        console.error("Login failed:", error);

        return res.status(500).json({
            success: false,
            message: "Login unavailable"
        });
    }
});

// =============================================
// COUNTER SESSION HEARTBEAT
// =============================================

router.post("/heartbeat", requireStaff, async (req, res) => {
    try {
        const result = await pool.query(
            `
            UPDATE counter_sessions
            SET
                last_seen_at = NOW(),
                expires_at = NOW() + INTERVAL '2 minutes'
            WHERE counter_id = $1
              AND user_id = $2
              AND session_id = $3
              AND expires_at > NOW()
            RETURNING counter_id
            `,
            [
                req.staff.counter_id,
                req.staff.sub,
                req.staff.counter_session_id
            ]
        );

        if (result.rowCount === 0) {
            return res.status(401).json({
                success: false,
                message: "Your counter session has expired. Please log in again."
            });
        }

        return res.json({
            success: true,
            message: "Counter session renewed"
        });

    } catch (error) {
        console.error("Heartbeat failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to renew counter session"
        });
    }
});

// =============================================
// STAFF LOGOUT
// =============================================

router.post("/logout", requireStaff, async (req, res) => {
    try {
        await pool.query(
            `
            DELETE FROM counter_sessions
            WHERE counter_id = $1
              AND user_id = $2
              AND session_id = $3
            `,
            [
                req.staff.counter_id,
                req.staff.sub,
                req.staff.counter_session_id
            ]
        );

        return res.json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (error) {
        console.error("Logout failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to log out"
        });
    }
});

// =============================================
// CURRENT STAFF
// =============================================

router.get("/me", requireStaff, async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT id, staff_id, full_name, is_active
            FROM users
            WHERE id = $1
            `,
            [req.staff.sub]
        );

        if (!result.rows[0]?.is_active) {
            return res.status(401).json({
                success: false,
                message: "Staff inactive"
            });
        }

        return res.json({
            success: true,
            staff: result.rows[0]
        });

    } catch (error) {
        console.error("Staff lookup failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve staff information"
        });
    }
});

module.exports = router;
