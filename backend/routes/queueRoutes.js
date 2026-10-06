const express = require("express");
const router = express.Router();
const pool = require("../config/database");


// =====================================================
// POST /api/queues/walk-in
// Create walk-in queue
// =====================================================
router.post("/walk-in", async (req, res) => {
    const client = await pool.connect();

    try {
        const { department_id } = req.body;

        if (!department_id) {
            return res.status(400).json({
                success: false,
                message: "department_id is required"
            });
        }

        await client.query("BEGIN");

        // 1. Get department
        const departmentResult = await client.query(
            `
            SELECT
                id,
                department_code,
                department_name
            FROM departments
            WHERE id = $1
              AND is_active = TRUE
            `,
            [department_id]
        );

        if (departmentResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Department not found"
            });
        }

        const department = departmentResult.rows[0];

        // 2. Get and lock the department queue counter
        const counterResult = await client.query(
            `
            SELECT next_number
            FROM department_queue_counters
            WHERE department_id = $1
            FOR UPDATE
            `,
            [department_id]
        );

        if (counterResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(500).json({
                success: false,
                message: "Queue counter not initialised for this department"
            });
        }

        const nextNumber = counterResult.rows[0].next_number;

        // IMPORTANT:
        // Database column is department_code, not code.
        const queueNumber =
            department.department_code +
            String(nextNumber).padStart(3, "0");

        // 3. Increment next queue number
        await client.query(
            `
            UPDATE department_queue_counters
            SET
                next_number = next_number + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE department_id = $1
            `,
            [department_id]
        );

        // 4. Create queue
        const queueResult = await client.query(
            `
            INSERT INTO queues (
                patient_id,
                appointment_id,
                department_id,
                queue_number,
                queue_type,
                priority,
                status
            )
            VALUES (
                NULL,
                NULL,
                $1,
                $2,
                'WALK_IN',
                0,
                'WAIT'
            )
            RETURNING
                id,
                queue_number,
                patient_id,
                appointment_id,
                department_id,
                queue_type,
                priority,
                status,
                issued_at
            `,
            [
                department_id,
                queueNumber
            ]
        );

        await client.query("COMMIT");

        return res.status(201).json({
            success: true,
            message: "Walk-in ticket created successfully",
            queue: queueResult.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Walk-in queue error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create walk-in queue",
            error: error.message
        });

    } finally {
        client.release();
    }
});


// =====================================================
// GET /api/queues
// Get queues
// =====================================================
router.get("/", async (req, res) => {
    try {
        const {
            department_id,
            status,
            queue_type
        } = req.query;

        let query = `
            SELECT
                q.id,
                q.queue_number,
                q.patient_id,
                q.appointment_id,
                q.department_id,
                d.department_code AS department_code,
                d.department_name AS department_name,
                q.queue_type,
                q.priority,
                q.status,
                q.issued_at,
                q.called_at,
                q.hold_at,
                q.completed_at,
                q.created_at,
                q.updated_at
            FROM queues q
            JOIN departments d
                ON d.id = q.department_id
            WHERE 1 = 1
        `;

        const values = [];

        if (department_id) {
            values.push(department_id);
            query += ` AND q.department_id = $${values.length}`;
        }

        if (status) {
            values.push(status);
            query += ` AND q.status = $${values.length}`;
        }

        if (queue_type) {
            values.push(queue_type);
            query += ` AND q.queue_type = $${values.length}`;
        }

        query += `
            ORDER BY
                q.priority DESC,
                q.issued_at ASC
        `;

        const result = await pool.query(query, values);

        return res.json({
            success: true,
            queues: result.rows
        });

    } catch (error) {
        console.error("Get queues error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve queues",
            error: error.message
        });
    }
});


// =====================================================
// POST /api/queues/:id/call
// Call queue
//
// WAIT -> SERVING = CALLED
// HOLD -> SERVING = RECALL
// =====================================================
router.post("/:id/call", async (req, res) => {
    const { id } = req.params;
    const { counter_id, staff_id } = req.body;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Find staff
        const staffResult = await client.query(
            `
            SELECT
                id,
                staff_id,
                full_name
            FROM users
            WHERE staff_id = $1
              AND is_active = TRUE
            `,
            [staff_id]
        );

        if (staffResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: `Staff member ${staff_id} not found`
            });
        }

        const staff = staffResult.rows[0];

        // 2. Get queue and lock it
        const queueResult = await client.query(
            `
            SELECT *
            FROM queues
            WHERE id = $1
            FOR UPDATE
            `,
            [id]
        );

        if (queueResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Queue not found"
            });
        }

        const queue = queueResult.rows[0];

        // Remember status BEFORE changing it
        const previousStatus = queue.status;

        // 3. Queue must be WAIT or HOLD
        if (
            queue.status !== "WAIT" &&
            queue.status !== "HOLD"
        ) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message:
                    `Queue cannot be called because its current status is ${queue.status}`
            });
        }

        // 4. Check whether counter is already serving another queue
        const servingResult = await client.query(
            `
            SELECT
                id,
                queue_number
            FROM queues
            WHERE counter_id = $1
              AND status = 'SERVING'
              AND id <> $2
            LIMIT 1
            `,
            [counter_id, id]
        );

        if (servingResult.rows.length > 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message:
                    `Counter is already serving queue ${servingResult.rows[0].queue_number}`
            });
        }

        // 5. Check counter
        const counterResult = await client.query(
            `
            SELECT
                id,
                department_id
            FROM counters
            WHERE id = $1
              AND is_active = TRUE
            `,
            [counter_id]
        );

        if (counterResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Counter not found or inactive"
            });
        }

        const counter = counterResult.rows[0];

        if (
            Number(counter.department_id) !==
            Number(queue.department_id)
        ) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message:
                    "Counter does not belong to this queue's department"
            });
        }

        // 6. Update queue
        const updateResult = await client.query(
            `
            UPDATE queues
            SET
                status = 'SERVING',
                counter_id = $1,
                called_by = $2,
                called_at = NOW(),
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
            `,
            [
                counter_id,
                staff.id,
                id
            ]
        );

        // 7. WAIT -> CALLED
        //    HOLD -> RECALL
        const actionType =
            previousStatus === "HOLD"
                ? "RECALL"
                : "CALLED";

        await client.query(
            `
            INSERT INTO queue_history (
                queue_id,
                action_type,
                staff_id,
                counter_id,
                action_at
            )
            VALUES ($1, $2, $3, $4, NOW())
            `,
            [
                id,
                actionType,
                staff.id,
                counter_id
            ]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message:
                actionType === "RECALL"
                    ? "Queue recalled successfully"
                    : "Queue called successfully",
            queue: updateResult.rows[0],
            staff: {
                id: staff.id,
                staff_id: staff.staff_id,
                full_name: staff.full_name
            }
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Call queue error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to call queue",
            error: error.message
        });

    } finally {
        client.release();
    }
});


// =====================================================
// POST /api/queues/:id/recall
// Recall currently serving queue
// =====================================================
router.post("/:id/recall", async (req, res) => {
    const { id } = req.params;
    const { counter_id, staff_id } = req.body;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const staffResult = await client.query(
            `
            SELECT
                id,
                staff_id,
                full_name
            FROM users
            WHERE staff_id = $1
              AND is_active = TRUE
            `,
            [staff_id]
        );

        if (staffResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: `Staff member ${staff_id} not found`
            });
        }

        const staff = staffResult.rows[0];

        const queueResult = await client.query(
            `
            SELECT *
            FROM queues
            WHERE id = $1
            FOR UPDATE
            `,
            [id]
        );

        if (queueResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Queue not found"
            });
        }

        const queue = queueResult.rows[0];

        if (queue.status !== "SERVING") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message:
                    `Queue cannot be recalled because its current status is ${queue.status}`
            });
        }

        if (
            Number(queue.counter_id) !==
            Number(counter_id)
        ) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message:
                    "Queue is not being served at this counter"
            });
        }

        const updateResult = await client.query(
            `
            UPDATE queues
            SET
                recall_count = COALESCE(recall_count, 0) + 1,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            `,
            [id]
        );

        await client.query(
            `
            INSERT INTO queue_history (
                queue_id,
                action_type,
                staff_id,
                counter_id,
                action_at
            )
            VALUES ($1, 'RECALL', $2, $3, NOW())
            `,
            [
                id,
                staff.id,
                counter_id
            ]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message: "Queue recalled successfully",
            queue: updateResult.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Recall queue error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to recall queue",
            error: error.message
        });

    } finally {
        client.release();
    }
});


// =====================================================
// POST /api/queues/:id/hold
// Put serving queue on hold
// =====================================================
router.post("/:id/hold", async (req, res) => {
    const { id } = req.params;
    const { counter_id, staff_id } = req.body;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const staffResult = await client.query(
            `
            SELECT
                id,
                staff_id,
                full_name
            FROM users
            WHERE staff_id = $1
              AND is_active = TRUE
            `,
            [staff_id]
        );

        if (staffResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: `Staff member ${staff_id} not found`
            });
        }

        const staff = staffResult.rows[0];

        const queueResult = await client.query(
            `
            SELECT *
            FROM queues
            WHERE id = $1
            FOR UPDATE
            `,
            [id]
        );

        if (queueResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Queue not found"
            });
        }

        const queue = queueResult.rows[0];

        if (queue.status !== "SERVING") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message:
                    `Queue cannot be put on hold because its current status is ${queue.status}`
            });
        }

        if (
            Number(queue.counter_id) !==
            Number(counter_id)
        ) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message:
                    "Queue is not being served at this counter"
            });
        }

        const updateResult = await client.query(
            `
            UPDATE queues
            SET
                status = 'HOLD',
                hold_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            `,
            [id]
        );

        await client.query(
            `
            INSERT INTO queue_history (
                queue_id,
                action_type,
                staff_id,
                counter_id,
                action_at
            )
            VALUES ($1, 'HOLD', $2, $3, NOW())
            `,
            [
                id,
                staff.id,
                counter_id
            ]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message: "Queue put on hold successfully",
            queue: updateResult.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Hold queue error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to put queue on hold",
            error: error.message
        });

    } finally {
        client.release();
    }
});


// =====================================================
// POST /api/queues/:id/complete
// Complete serving queue
// =====================================================
router.post("/:id/complete", async (req, res) => {
    const { id } = req.params;
    const { counter_id, staff_id } = req.body;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const staffResult = await client.query(
            `
            SELECT
                id,
                staff_id,
                full_name
            FROM users
            WHERE staff_id = $1
              AND is_active = TRUE
            `,
            [staff_id]
        );

        if (staffResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: `Staff member ${staff_id} not found`
            });
        }

        const staff = staffResult.rows[0];

        const queueResult = await client.query(
            `
            SELECT *
            FROM queues
            WHERE id = $1
            FOR UPDATE
            `,
            [id]
        );

        if (queueResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Queue not found"
            });
        }

        const queue = queueResult.rows[0];

        if (queue.status !== "SERVING") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message:
                    `Queue cannot be completed because its current status is ${queue.status}`
            });
        }

        if (
            Number(queue.counter_id) !==
            Number(counter_id)
        ) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message:
                    "Queue is not being served at this counter"
            });
        }

        const updateResult = await client.query(
            `
            UPDATE queues
            SET
                status = 'COMPLETED',
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            `,
            [id]
        );

        await client.query(
            `
            INSERT INTO queue_history (
                queue_id,
                action_type,
                staff_id,
                counter_id,
                action_at
            )
            VALUES ($1, 'COMPLETE', $2, $3, NOW())
            `,
            [
                id,
                staff.id,
                counter_id
            ]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message: "Queue completed successfully",
            queue: updateResult.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Complete queue error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to complete queue",
            error: error.message
        });

    } finally {
        client.release();
    }
});


module.exports = router;