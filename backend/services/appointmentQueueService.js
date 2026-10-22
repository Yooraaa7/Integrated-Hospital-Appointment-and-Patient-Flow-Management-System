
/*
 * Generate a separate appointment queue number.
 *
 * Walk-in:      CD001, CD002...
 * Appointment:  AP-CD01, AP-CD02...
 *
 * Must run within the caller's PostgreSQL transaction.
 */

async function generateAppointmentNumber(client, departmentId) {
    const result = await client.query(
        `
        UPDATE department_queue_counters AS qc
        SET
            next_appointment_number =
                qc.next_appointment_number + 1,
            updated_at = NOW()
        FROM departments AS d
        WHERE qc.department_id = $1
          AND d.id = qc.department_id
          AND d.is_active = TRUE
        RETURNING
            d.department_code,
            qc.next_appointment_number - 1
                AS issued_number
        `,
        [departmentId]
    );

    if (result.rows.length === 0) {
        throw new Error(
            "Appointment counter is not configured for this department"
        );
    }

    const { department_code, issued_number } = result.rows[0];

    return (
        "AP-" +
        department_code +
        String(issued_number).padStart(2, "0")
    );
}

module.exports = {
    generateAppointmentNumber
};
