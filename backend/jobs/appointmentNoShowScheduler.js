
function startAppointmentNoShowScheduler(pool) {
    let isRunning = false;

    async function updateNoShowAppointments() {
        if (isRunning) {
            return;
        }

        isRunning = true;

        try {
            const result = await pool.query(`
                UPDATE appointments AS a
                SET
                    status = 'NO_SHOW',
                    updated_at = NOW()
                WHERE
                    a.status IN ('BOOKED', 'CONFIRMED', 'RESCHEDULED')
                    AND (
                        a.scheduled_at AT TIME ZONE 'Asia/Kuala_Lumpur'
                    )::date < (
                        NOW() AT TIME ZONE 'Asia/Kuala_Lumpur'
                    )::date
                    AND NOT EXISTS (
                        SELECT 1
                        FROM queues AS q
                        WHERE q.appointment_id = a.id
                    )
                RETURNING a.id;
            `);

            if (result.rowCount > 0) {
                console.log(
                    `[NO_SHOW Scheduler] Updated ${result.rowCount} appointment(s):`,
                    result.rows.map(row => row.id)
                );
            }
        } catch (error) {
            console.error(
                "[NO_SHOW Scheduler] Failed to update appointments:",
                error.message
            );
        } finally {
            isRunning = false;
        }
    }

    // Check immediately when the backend starts.
    updateNoShowAppointments();

    // Check again every 60 seconds.
    setInterval(updateNoShowAppointments, 60 * 1000);

    console.log(
        "[NO_SHOW Scheduler] Started. Timezone: Asia/Kuala_Lumpur"
    );
}

module.exports = startAppointmentNoShowScheduler;