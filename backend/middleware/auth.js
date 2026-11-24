const jwt = require("jsonwebtoken");
const pool = require("../config/database");

async function requireStaff(req, res, next) {
    const header = req.get("authorization") || "";
    const match = /^Bearer (.+)$/i.exec(header);

    if (!match) {
        return res.status(401).json({
            success: false,
            message: "Please log in"
        });
    }

    try {
        // 1. Verify JWT
        const staff = jwt.verify(
            match[1],
            process.env.JWT_SECRET,
            { algorithms: ["HS256"] }
        );

        if (
            staff.role !== "STAFF" &&
            staff.role !== "ADMIN"
        ) {
            return res.status(403).json({
                success: false,
                message: "Invalid staff role"
            });
        }

        // 2. Require counter session information
        if (
            !staff.sub ||
            !staff.counter_id ||
            !staff.counter_session_id
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid counter session. Please log in again."
            });
        }

        // 3. Verify staff, counter and active session
        const result = await pool.query(
            `
            SELECT
                u.id,
                u.staff_id,
                u.role,
                c.id AS counter_id,
                cs.session_id
            FROM users u
            JOIN counter_sessions cs
                ON cs.user_id = u.id
            JOIN counters c
                ON c.id = cs.counter_id
            WHERE u.id = $1
              AND u.is_active = TRUE
              AND u.role = $2
              AND c.id = $3
              AND c.is_active = TRUE
              AND cs.session_id = $4
              AND cs.expires_at > NOW()
            `,
            [
                staff.sub,
                staff.role,
                staff.counter_id,
                staff.counter_session_id
            ]
        );

        if (result.rowCount === 0) {
            return res.status(401).json({
                success: false,
                message: "Your counter session has expired or is no longer valid. Please log in again."
            });
        }

        // 4. Attach verified staff information
        req.staff = {
            ...staff,
            id: result.rows[0].id,
            staff_id: result.rows[0].staff_id,
            counter_id: result.rows[0].counter_id
        };

        next();

    } catch (error) {
        console.error("Staff authentication error:", error.message);

        return res.status(401).json({
            success: false,
            message: "Session expired or invalid. Please log in again."
        });
    }
}

module.exports = {
    requireStaff
};
