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

        // Get department
        const departmentResult = await client.query(
            `
            SELECT id, code, name
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

        // Lock this department's counter row
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

        const queueNumber =
            department.code +
            String(nextNumber).padStart(3, "0");

        // Increment counter
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

        // Create queue
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

        res.status(201).json({
            success: true,
            message: "Walk-in ticket created successfully",
            queue: queueResult.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Walk-in queue error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create walk-in queue"
        });

    } finally {
        client.release();
    }
});