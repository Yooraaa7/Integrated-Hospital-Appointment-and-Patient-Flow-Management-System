-- Run once against EXISTING database (does not modify queue_type or appointment_id).
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'STAFF';
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_staff_id ON users(staff_id);
CREATE INDEX IF NOT EXISTS idx_queues_department_status ON queues(department_id,status,issued_at);
CREATE INDEX IF NOT EXISTS idx_queue_history_queue ON queue_history(queue_id,action_at);
