const pool = require("../config/database");

const TIME_ZONE = "Asia/Kuala_Lumpur";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the current date in Malaysia as YYYY-MM-DD.
 */
function getMalaysiaDateKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);

    const values = {};

    for (const part of parts) {
        if (part.type !== "literal") {
            values[part.type] = part.value;
        }
    }

    return `${values.year}-${values.month}-${values.day}`;
}

/**
 * Calculates the previous Malaysian calendar day.
 */
function getPreviousDayRange() {
    const todayKey = getMalaysiaDateKey();

    const todayStart = new Date(
        `${todayKey}T00:00:00+08:00`
    );

    const yesterdayStart = new Date(
        todayStart.getTime() - ONE_DAY_MS
    );

    return {
        start: yesterdayStart,
        end: todayStart
    };
}

/**
 * Expires all incomplete queues from the previous
 * Malaysian calendar day.
 *
 * Appointment queues still on HOLD become NO_SHOW.
 * Completed appointments remain COMPLETED.
 *
 * Queue and appointment updates are transactional.
 */
async function expirePreviousDayQueues() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const { start, end } = getPreviousDayRange();

        /*
         * Lock department rows first, matching the
         * department-before-queue lock order used by
         * queueRoutes.js.
         */
        const departmentLocks = await client.query(
            `
            SELECT d.id
            FROM departments d
            WHERE EXISTS (
                SELECT 1
                FROM queues q
                WHERE q.department_id = d.id
                AND q.issued_at >= $1
                AND q.issued_at < $2
                AND q.status NOT IN ('COMPLETED', 'EXPIRED')
            )
            ORDER BY d.id
            FOR UPDATE OF d
            `,
            [start, end]
        );

        /*
         * Lock the eligible queues.
         */
        const queuesResult = await client.query(
            `
            SELECT
                id,
                queue_number,
                queue_type,
                appointment_id,
                status
            FROM queues
            WHERE issued_at >= $1
              AND issued_at < $2
              AND status NOT IN ('COMPLETED', 'EXPIRED')
            ORDER BY department_id, id
            FOR UPDATE
            `,
            [start, end]
        );

        let expiredCount = 0;
        let noShowCount = 0;

        for (const queue of queuesResult.rows) {

            /*
             * Only appointment queues still on HOLD
             * become NO_SHOW.
             */
            if (
                queue.queue_type === "APPOINTMENT" &&
                queue.status === "HOLD" &&
                queue.appointment_id
            ) {
                const appointmentUpdate = await client.query(
                    `
                    UPDATE appointments
                    SET
                        status = 'NO_SHOW',
                        updated_at = NOW()
                    WHERE id = $1
                      AND status NOT IN ('COMPLETED', 'NO_SHOW')
                    RETURNING id
                    `,
                    [queue.appointment_id]
                );

                if (appointmentUpdate.rowCount > 0) {
                    noShowCount++;
                }
            }

            /*
             * Mark queue as EXPIRED.
             * Do not physically delete it.
             */
            const queueUpdate = await client.query(
                `
                UPDATE queues
                SET
                    status = 'EXPIRED',
                    last_action_at = NOW(),
                    updated_at = NOW()
                WHERE id = $1
                  AND status NOT IN ('COMPLETED', 'EXPIRED')
                RETURNING id
                `,
                [queue.id]
            );

            if (queueUpdate.rowCount > 0) {
                expiredCount++;
            }
        }

        await client.query("COMMIT");

        const result = {
            success: true,
            dateProcessed: start.toISOString(),
            expiredCount,
            noShowCount,
            departmentsLocked: departmentLocks.rowCount
        };

        console.log(
            "[Queue Expiration] Completed:",
            result
        );

        return result;

    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error(
                "[Queue Expiration] Rollback failed:",
                rollbackError
            );
        }

        console.error(
            "[Queue Expiration] Failed:",
            error
        );

        throw error;

    } finally {
        client.release();
    }
}

/**
 * Schedules cleanup at every Malaysian midnight.
 *
 * Runs once at startup to recover queues from a
 * previous day if the server was offline.
 */
function startQueueExpirationScheduler() {

    function scheduleNextMidnight() {
        const todayKey = getMalaysiaDateKey();

        const nextMidnight = new Date(
            `${todayKey}T00:00:00+08:00`
        ).getTime() + ONE_DAY_MS;

        const delay = Math.max(
            1000,
            nextMidnight - Date.now()
        );

        setTimeout(async () => {

            try {
                await expirePreviousDayQueues();

            } catch (error) {
                console.error(
                    "[Queue Expiration] Scheduled cleanup error:",
                    error
                );
            }

            scheduleNextMidnight();

        }, delay);
    }

    // Recover missed cleanup when backend starts.
    expirePreviousDayQueues()
        .catch(error => {
            console.error(
                "[Queue Expiration] Startup cleanup error:",
                error
            );
        });

    scheduleNextMidnight();

    console.log(
        "[Queue Expiration] Scheduler started. " +
        "Timezone: Asia/Kuala_Lumpur"
    );
}

module.exports = {
    expirePreviousDayQueues,
    startQueueExpirationScheduler
};
