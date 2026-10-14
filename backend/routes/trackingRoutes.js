
const express = require("express");
const router = express.Router();

const pool = require("../config/database");

// GET /api/tracking/:token
// Public read-only tracking for one specific ticket
router.get("/:token", async (req, res) => {
    const { token } = req.params;

    res.set("Cache-Control", "no-store");

    // Validate tracking token
    const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(token)) {
        return res.status(400).json({
            success: false,
            message: "Invalid tracking link"
        });
    }

    try {
        // Find the patient's queue using its unique token
        const ticketResult = await pool.query(
            `
            SELECT
                q.queue_number,
                q.status,
                q.issued_at,
                q.department_id,
                d.department_name,
                c.counter_number AS assigned_counter
            FROM queues q
            JOIN departments d
                ON d.id = q.department_id
            LEFT JOIN counters c
                ON c.id = q.counter_id
            WHERE q.tracking_token = $1::uuid
            LIMIT 1
            `,
            [token]
        );

        if (ticketResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Tracking ticket not found"
            });
        }

        const ticket = ticketResult.rows[0];

        let nowServing = [];
        let nextInQueue = null;

        // Only retrieve queue progress if patient is
        // WAITING or ON HOLD.
        if (ticket.status === "WAIT" || ticket.status === "HOLD") {

            const [servingResult, nextResult] = await Promise.all([

                pool.query(
                    `
                    SELECT
                        q.queue_number,
                        c.counter_number
                    FROM queues q
                    LEFT JOIN counters c
                        ON c.id = q.counter_id
                    WHERE q.department_id = $1
                      AND q.status = 'SERVING'
                    ORDER BY
                        q.called_at DESC NULLS LAST,
                        q.id DESC
                    LIMIT 8
                    `,
                    [ticket.department_id]
                ),

                pool.query(
                    `
                    SELECT q.queue_number
                    FROM queues q
                    WHERE q.department_id = $1
                      AND q.status = 'WAIT'
                    ORDER BY
                        q.priority DESC,
                        q.issued_at ASC,
                        q.id ASC
                    LIMIT 1
                    `,
                    [ticket.department_id]
                )

            ]);

            nowServing = servingResult.rows;
            nextInQueue = nextResult.rows[0] || null;
        }

        return res.json({
            success: true,

            queue: {
                queue_number: ticket.queue_number,
                department_name: ticket.department_name,
                status: ticket.status,
                issued_at: ticket.issued_at,

                counter_number:
                    ticket.status === "SERVING"
                        ? ticket.assigned_counter
                        : null
            },

            now_serving: nowServing,
            next_in_queue: nextInQueue,

            checked_at: new Date().toISOString()
        });

    } catch (error) {
        console.error("Queue tracking error:", error);

        return res.status(500).json({
            success: false,
            message: "Queue tracking is temporarily unavailable"
        });
    }
});

module.exports = router;
