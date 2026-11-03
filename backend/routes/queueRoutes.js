const express = require("express");
const router = express.Router();

const pool = require("../config/database");
const { requireStaff } = require("../middleware/auth");

// =====================================================
// CONFIGURATION
// =====================================================

// Appointment visibility is handled by dashboard.js.
// Backend rules below enforce when tickets can be called.

const QUEUE_STATUS = {
    WAIT: "WAIT",
    SERVING: "SERVING",
    HOLD: "HOLD",
    COMPLETED: "COMPLETED",
    EXPIRED: "EXPIRED"
};

const QUEUE_TYPE = {
    WALK_IN: "WALK_IN",
    APPOINTMENT: "APPOINTMENT"
};

// =====================================================
// HELPERS
// =====================================================

function httpError(status, message) {
    const error = new Error(message);
    error.httpStatus = status;
    return error;
}

function validId(value) {
    return (
        typeof value === "string" ||
        typeof value === "number"
    ) && /^[1-9]\d*$/.test(String(value));
}

function sameId(a, b) {
    return String(a) === String(b);
}

function handleError(res, error, label) {
    if (!error.httpStatus) {
        console.error(label, error);
    }

    return res.status(error.httpStatus || 500).json({
        success: false,
        message: error.httpStatus
            ? error.message
            : "Unable to process queue request"
    });
}

/*
 * Run queue changes in a PostgreSQL transaction.
 * Rollback happens automatically when an error occurs.
 */
async function transaction(work) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await work(client);

        await client.query("COMMIT");

        return result;

    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Rollback error:", rollbackError);
        }

        throw error;

    } finally {
        client.release();
    }
}

/*
 * Obtain the authenticated staff's database record.
 *
 * req.staff comes from the existing JWT middleware.
 */
async function getStaff(client, staffId) {
    const result = await client.query(
        `
        SELECT
            id,
            staff_id,
            full_name
        FROM users
        WHERE staff_id = $1
          AND is_active = TRUE
        `,
        [staffId]
    );

    if (!result.rows.length) {
        throw httpError(
            403,
            "Staff account is not active or does not exist"
        );
    }

    return result.rows[0];
}

/*
 * Check the caller's counter ID against the
 * counter established during staff login.
 */
function validateCounterAccess(req) {
    const counterId = req.body?.counter_id;

    if (
        !validId(counterId) ||
        !req.staff?.counter_id ||
        !sameId(counterId, req.staff.counter_id)
    ) {
        throw httpError(
            403,
            "Not authorised for this counter"
        );
    }

    return counterId;
}

/*
 * All queue mutations within a department acquire
 * this lock first.
 *
 * This serialises competing staff call operations
 * and helps prevent two counters choosing the
 * same priority ticket simultaneously.
 */
async function lockDepartmentForQueue(
    client,
    queueId
) {
    const result = await client.query(
        `
        SELECT
            d.id
        FROM departments d
        WHERE d.id = (
            SELECT department_id
            FROM queues
            WHERE id = $1
        )
        FOR UPDATE
        `,
        [queueId]
    );

    if (!result.rows.length) {
        throw httpError(404, "Queue not found");
    }

    return result.rows[0].id;
}

async function getLockedQueue(client, queueId) {
    const result = await client.query(
        `
        SELECT *
        FROM queues
        WHERE id = $1
        FOR UPDATE
        `,
        [queueId]
    );

    if (!result.rows.length) {
        throw httpError(404, "Queue not found");
    }

    return result.rows[0];
}

async function getLockedCounter(client, counterId) {
    const result = await client.query(
        `
        SELECT
            id,
            department_id
        FROM counters
        WHERE id = $1
          AND is_active = TRUE
        FOR UPDATE
        `,
        [counterId]
    );

    if (!result.rows.length) {
        throw httpError(
            404,
            "Counter not found or inactive"
        );
    }

    return result.rows[0];
}

function checkDepartment(queue, counter) {
    if (
        !sameId(queue.department_id, counter.department_id)
    ) {
        throw httpError(
            403,
            "Counter does not belong to this queue's department"
        );
    }
}

/*
 * Verify that a counter is not currently
 * serving a different queue.
 */
async function ensureCounterAvailable(
    client,
    counterId,
    queueId
) {
    const result = await client.query(
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
        [counterId, queueId]
    );

    if (result.rows.length) {
        throw httpError(
            409,
            `Counter is already serving queue ` +
            result.rows[0].queue_number
        );
    }
}

/*
 * Check appointment booked time on the server.
 *
 * A WAIT appointment can only be called at
 * or after queues.scheduled_at.
 */
async function ensureAppointmentCallable(client, queue) {
    if (
        queue.queue_type !== QUEUE_TYPE.APPOINTMENT ||
        queue.status !== QUEUE_STATUS.WAIT
    ) {
        return;
    }

    if (!queue.scheduled_at) {
        throw httpError(
            409,
            "Appointment scheduled time is missing"
        );
    }

    const result = await client.query(
        `
        SELECT
            NOW() >= $1::timestamptz AS can_call
        `,
        [queue.scheduled_at]
    );

    if (!result.rows[0].can_call) {
        throw httpError(
            409,
            "This appointment cannot be called " +
            "before its booked time"
        );
    }
}

/*
 * Priority enforcement:
 *
 * 1. Find earliest eligible appointment.
 * 2. If one exists, it must be called before
 *    any waiting walk-in or later appointment.
 *
 * Upcoming appointments are excluded until
 * their booked times arrive.
 *
 * HOLD tickets are recalled separately and
 * are not blocked by the waiting priority rule.
 */
async function ensurePriorityOrder(client, queue) {
    if (queue.status !== QUEUE_STATUS.WAIT) {
        return;
    }

    const result = await client.query(
        `
        SELECT
            id,
            queue_number
        FROM queues
        WHERE department_id = $1
          AND queue_type = 'APPOINTMENT'
          AND status = 'WAIT'
          AND scheduled_at IS NOT NULL
          AND scheduled_at <= NOW()
        ORDER BY
            scheduled_at ASC,
            issued_at ASC,
            id ASC
        LIMIT 1
        `,
        [queue.department_id]
    );

    if (!result.rows.length) {
        return;
    }

    const priorityQueue = result.rows[0];

    if (!sameId(priorityQueue.id, queue.id)) {
        throw httpError(
            409,
            `Priority appointment ` +
            `${priorityQueue.queue_number} ` +
            `must be called first`
        );
    }
}

/*
 * Append one event to queue_history.
 */
async function recordHistory(
    client,
    queueId,
    action,
    staffId,
    counterId
) {
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
            queueId,
            action,
            staffId,
            counterId
        ]
    );
}

// =====================================================
// POST /api/queues/walk-in
// Create a walk-in ticket
// =====================================================

router.post("/walk-in", async (req, res) => {
    const departmentId = req.body?.department_id;

    if (!validId(departmentId)) {
        return res.status(400).json({
            success: false,
            message: "Valid department_id is required"
        });
    }

    try {
        const queue = await transaction(async client => {
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
                [departmentId]
            );

            if (!departmentResult.rows.length) {
                throw httpError(
                    404,
                    "Department not found"
                );
            }

            const department = departmentResult.rows[0];

            // Lock and increment walk-in counter.
            const counterResult = await client.query(
                `
                UPDATE department_queue_counters
                SET
                    next_number = next_number + 1,
                    updated_at = NOW()
                WHERE department_id = $1
                RETURNING
                    next_number - 1 AS issued_number
                `,
                [departmentId]
            );

            if (!counterResult.rows.length) {
                throw httpError(
                    500,
                    "Walk-in counter is not initialised"
                );
            }

            const sequence = String(
                counterResult.rows[0].issued_number
            ).padStart(3, "0");

            const queueNumber =
                department.department_code + sequence;

            const result = await client.query(
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
                    issued_at,
                    scheduled_at,
                    tracking_token
                `,
                [departmentId, queueNumber]
            );

            return result.rows[0];
        });

        return res.status(201).json({
            success: true,
            message: "Walk-in ticket created successfully",
            queue
        });

    } catch (error) {
        return handleError(res, error, "Walk-in queue error:");
    }
});

// =====================================================
// GET /api/queues
// Read queues from PostgreSQL
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
                q.scheduled_at,
                q.department_id,

                d.department_code,
                d.department_name,

                q.queue_type,
                q.priority,
                q.status,

                q.issued_at,
                q.called_at,
                q.hold_at,
                q.completed_at,
                q.last_action_at,
                q.created_at,
                q.updated_at,
                q.recall_count,

                c.counter_number,
                u.staff_id,

                (
                    SELECT COALESCE(
                        json_agg(
                            json_build_object(
                                'type', h.action_type,
                                'timestamp', h.action_at,
                                'counter',
                                    CASE
                                        WHEN hc.counter_number IS NULL
                                        THEN NULL
                                        ELSE 'Counter ' ||
                                            hc.counter_number
                                    END,
                                'staffID', hu.staff_id
                            )
                            ORDER BY h.action_at
                        ),
                        '[]'::json
                    )
                    FROM queue_history h

                    LEFT JOIN counters hc
                        ON hc.id = h.counter_id

                    LEFT JOIN users hu
                        ON hu.id = h.staff_id

                    WHERE h.queue_id = q.id
                ) AS history

            FROM queues q

            JOIN departments d
                ON d.id = q.department_id

            LEFT JOIN counters c
                ON c.id = q.counter_id

            LEFT JOIN users u
                ON u.id = q.called_by

            WHERE 1 = 1
            AND q.status <> 'EXPIRED'
        `;

        const values = [];

        if (department_id) {
            values.push(department_id);

            query += `
                AND q.department_id = $${values.length}
            `;
        }

        if (status) {
            values.push(status);

            query += `
                AND q.status = $${values.length}
            `;
        }

        if (queue_type) {
            values.push(queue_type);

            query += `
                AND q.queue_type = $${values.length}
            `;
        }

        /*
         * Return all queues, including appointments
         * more than 15 minutes away.
         *
         * qms.js filters future appointments out
         * of the active dashboard waiting list.
         *
         * Do not filter them here, because staff
         * queue history still needs all records.
         */
        query += `
            ORDER BY
                q.priority DESC,
                q.issued_at ASC,
                q.id ASC
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
            message: "Failed to retrieve queues"
        });
    }
});

// =====================================================
// POST /api/queues/:id/call
//
// WAIT -> SERVING = CALLED
// HOLD -> SERVING = RECALL
//
// Appointments must have reached booked time.
// Ready appointments take priority over walk-ins.
// =====================================================

router.post("/:id/call", requireStaff, async (req, res) => {
    try {
        const counterId = validateCounterAccess(req);
        const queueId = req.params.id;

        if (!validId(queueId)) {
            throw httpError(400, "Invalid queue ID");
        }

        const result = await transaction(async client => {
            const staff = await getStaff(
                client,
                req.staff.staff_id
            );

            // Acquire department lock before queue lock.
            await lockDepartmentForQueue(client, queueId);

            // Lock the counter to coordinate calls.
            const counter = await getLockedCounter(
                client,
                counterId
            );

            const queue = await getLockedQueue(
                client,
                queueId
            );

            checkDepartment(queue, counter);

            if (
                queue.status !== QUEUE_STATUS.WAIT &&
                queue.status !== QUEUE_STATUS.HOLD
            ) {
                throw httpError(
                    409,
                    `Queue cannot be called because ` +
                    `its status is ${queue.status}`
                );
            }

            await ensureCounterAvailable(
                client,
                counterId,
                queueId
            );

            // Validate appointment schedule.
            await ensureAppointmentCallable(client, queue);

            // Give eligible appointments priority.
            await ensurePriorityOrder(client, queue);

            const wasOnHold =
                queue.status === QUEUE_STATUS.HOLD;

            const actionType = wasOnHold
                ? "RECALL"
                : "CALLED";

            const updateResult = await client.query(
                `
                UPDATE queues
                SET
                    status = 'SERVING',
                    counter_id = $1,
                    called_by = $2,
                    called_at = NOW(),
                    hold_at = NULL,
                    last_action_at = NOW(),
                    updated_at = NOW()
                WHERE id = $3
                RETURNING *
                `,
                [
                    counterId,
                    staff.id,
                    queueId
                ]
            );

            await recordHistory(
                client,
                queueId,
                actionType,
                staff.id,
                counterId
            );

            return {
                queue: updateResult.rows[0],
                actionType,
                staff
            };
        });

        return res.status(200).json({
            success: true,
            message:
                result.actionType === "RECALL"
                    ? "Queue recalled successfully"
                    : "Queue called successfully",
            queue: result.queue,
            staff: {
                id: result.staff.id,
                staff_id: result.staff.staff_id,
                full_name: result.staff.full_name
            }
        });

    } catch (error) {
        return handleError(res, error, "Call queue error:");
    }
});

// =====================================================
// SHARED HANDLER FOR RECALL / HOLD / COMPLETE
// =====================================================

async function processServingAction(req, res, action) {
    try {
        const counterId = validateCounterAccess(req);
        const queueId = req.params.id;

        if (!validId(queueId)) {
            throw httpError(400, "Invalid queue ID");
        }

        const updated = await transaction(async client => {
            const staff = await getStaff(
                client,
                req.staff.staff_id
            );

            // Lock in the same order as the Call route.
            await lockDepartmentForQueue(client, queueId);

            const counter = await getLockedCounter(
                client,
                counterId
            );

            const queue = await getLockedQueue(
                client,
                queueId
            );

            checkDepartment(queue, counter);

            if (queue.status !== QUEUE_STATUS.SERVING) {
                throw httpError(
                    409,
                    `Queue cannot be updated because ` +
                    `its status is ${queue.status}`
                );
            }

            if (!sameId(queue.counter_id, counterId)) {
                throw httpError(
                    403,
                    "Queue is not being served at this counter"
                );
            }

            let result;

            if (action === "RECALL") {
                // Re-announce the currently serving queue.
                result = await client.query(
                    `
                    UPDATE queues
                    SET
                        recall_count =
                            COALESCE(recall_count, 0) + 1,
                        last_action_at = NOW(),
                        updated_at = NOW()
                    WHERE id = $1
                    RETURNING *
                    `,
                    [queueId]
                );

            } else if (action === "HOLD") {
                result = await client.query(
                    `
                    UPDATE queues
                    SET
                        status = 'HOLD',
                        hold_at = NOW(),
                        last_action_at = NOW(),
                        updated_at = NOW()
                    WHERE id = $1
                    RETURNING *
                    `,
                    [queueId]
                );

            
                        
            } else if (action === "COMPLETE") {
                result = await client.query(
                    `
                    UPDATE queues
                    SET
                        status = 'COMPLETED',
                        completed_at = NOW(),
                        last_action_at = NOW(),
                        updated_at = NOW()
                    WHERE id = $1
                    RETURNING *
                    `,
                    [queueId]
                );

                // Synchronize linked appointment.
                if (
                    queue.queue_type === QUEUE_TYPE.APPOINTMENT &&
                    queue.appointment_id
                ) {
                    const appointmentUpdate = await client.query(
                        `
                        UPDATE appointments
                        SET
                            status = 'COMPLETED',
                            updated_at = NOW()
                        WHERE id = $1
                        AND status = 'CHECKED_IN'
                        RETURNING id
                        `,
                        [queue.appointment_id]
                    );

                    if (appointmentUpdate.rowCount === 0) {
                        const appointmentCheck = await client.query(
                            `
                            SELECT id, status
                            FROM appointments
                            WHERE id = $1
                            `,
                            [queue.appointment_id]
                        );

                        if (appointmentCheck.rowCount === 0) {
                            throw httpError(
                                404,
                                "Linked appointment was not found"
                            );
                        }

                        if (
                            appointmentCheck.rows[0].status !== "COMPLETED"
                        ) {
                            throw httpError(
                                409,
                                "Appointment cannot be completed because its status is " +
                                appointmentCheck.rows[0].status
                            );
                        }
                    }
                }
            } else {
                throw httpError(
                    400,
                    "Unsupported queue action"
                );
            }

            await recordHistory(
                client,
                queueId,
                action,
                staff.id,
                counterId
            );

            return result.rows[0];
        });

        const messages = {
            RECALL: "Queue recalled successfully",
            HOLD: "Queue put on hold successfully",
            COMPLETE: "Queue completed successfully"
        };

        return res.status(200).json({
            success: true,
            message: messages[action],
            queue: updated
        });

    } catch (error) {
        return handleError(
            res,
            error,
            `${action} queue error:`
        );
    }
}

// =====================================================
// POST /api/queues/:id/recall
// Re-announce current SERVING ticket
// =====================================================

router.post("/:id/recall", requireStaff, (req, res) => {
    return processServingAction(req, res, "RECALL");
});

// =====================================================
// POST /api/queues/:id/hold
// SERVING -> HOLD
// =====================================================

router.post("/:id/hold", requireStaff, (req, res) => {
    return processServingAction(req, res, "HOLD");
});

// =====================================================
// POST /api/queues/:id/complete
// SERVING -> COMPLETED
// =====================================================

router.post("/:id/complete", requireStaff, (req, res) => {
    return processServingAction(req, res, "COMPLETE");
});

module.exports = router;
