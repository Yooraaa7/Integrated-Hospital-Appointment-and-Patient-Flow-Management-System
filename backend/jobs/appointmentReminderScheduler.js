
function startAppointmentReminderScheduler(pool) {

    let isRunning = false;

    async function generateAppointmentReminders() {

        if (isRunning) {
            return;
        }

        isRunning = true;

        try {

            // Generate 7-day reminders.
            await pool.query(
                `INSERT INTO patient_notifications (
                    patient_id,
                    appointment_id,
                    notification_type,
                    title,
                    message,
                    detail,
                    dedupe_key
                )
                SELECT
                    a.patient_id,
                    a.id,
                    'APPOINTMENT_REMINDER_7_DAYS',
                    'Appointment in 1 Week',
                    'Your appointment is coming up in 7 days.',
                    TO_CHAR(
                        a.scheduled_at AT TIME ZONE 'Asia/Kuala_Lumpur',
                        'DD Mon YYYY, HH12:MI AM'
                    ) || ' • ' || d.department_name,
                    'appointment:' || a.id ||
                    ':7day:' || a.scheduled_at::TEXT
                FROM appointments a
                JOIN departments d ON d.id = a.department_id
                WHERE a.status IN ('BOOKED', 'CONFIRMED', 'RESCHEDULED')
                  AND (
                    a.scheduled_at AT TIME ZONE 'Asia/Kuala_Lumpur'
                  )::DATE =
                  (
                    (NOW() AT TIME ZONE 'Asia/Kuala_Lumpur')::DATE + 7
                  )
                ON CONFLICT (dedupe_key) DO NOTHING`
            );

            // Generate 1-day reminders.
            await pool.query(
                `INSERT INTO patient_notifications (
                    patient_id,
                    appointment_id,
                    notification_type,
                    title,
                    message,
                    detail,
                    dedupe_key
                )
                SELECT
                    a.patient_id,
                    a.id,
                    'APPOINTMENT_REMINDER_1_DAY',
                    'Appointment Tomorrow',
                    'Your appointment is scheduled for tomorrow.',
                    TO_CHAR(
                        a.scheduled_at AT TIME ZONE 'Asia/Kuala_Lumpur',
                        'DD Mon YYYY, HH12:MI AM'
                    ) || ' • ' || d.department_name,
                    'appointment:' || a.id ||
                    ':1day:' || a.scheduled_at::TEXT
                FROM appointments a
                JOIN departments d ON d.id = a.department_id
                WHERE a.status IN ('BOOKED', 'CONFIRMED', 'RESCHEDULED')
                  AND (
                    a.scheduled_at AT TIME ZONE 'Asia/Kuala_Lumpur'
                  )::DATE =
                  (
                    (NOW() AT TIME ZONE 'Asia/Kuala_Lumpur')::DATE + 1
                  )
                ON CONFLICT (dedupe_key) DO NOTHING`
            );

        } catch (error) {

            console.error(
                "Appointment reminder scheduler failed:",
                error.message
            );

        } finally {

            isRunning = false;

        }
    }

    // Run once when the backend starts.
    generateAppointmentReminders();

    // Check for upcoming reminders every minute.
    setInterval(generateAppointmentReminders, 60 * 1000);

    console.log("Appointment reminder scheduler started.");
}

module.exports = startAppointmentReminderScheduler;
