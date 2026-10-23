# The Care Hospital — Pre-Database Final Frontend

This folder contains the consolidated frontend version built before PostgreSQL/Node.js database integration.

## Included
- Shared standardized CSS style
- Public homepage
- Dynamic navbar
  - Not logged in: Login + Start Appointment
  - Logged in: Profile + Logout + Start Appointment
- Patient sign up
  - Full name
  - Email or IC number
  - Date of birth
  - Password / confirm password
  - Terms & Conditions checkbox
  - Minimum 8 characters
  - At least one capital letter
  - At least one number
  - At least one special character
- Login using email or IC number
- Patient dashboard
- Patient profile
- Find a Doctor search/filter
- Dynamic doctor profile
- Rule-based department routing
- Appointment booking
- Same-day booking with 15-minute buffer
- Doctor weekly schedules
- Appointment rescheduling
- Appointment cancellation
- Full My Appointments details
- Arrival Register button on appointment date
- Queue number generation for QMS prototype
- QMS queue data stored in localStorage
- Responsive desktop/tablet/mobile layout
- Analysis page removed from the patient website

## Run
Open the folder in Visual Studio Code and run `index.html` with Live Server.

## Prototype storage
The project currently uses browser localStorage:
- `careRegisteredUsers`
- `careUser`
- `careAppointments`
- `careQMSQueue`

This is intentional for the pre-database version.

## Important
Passwords are stored in localStorage only for this frontend prototype. Do not use this approach after connecting the Node.js/PostgreSQL backend. In the database-connected version, passwords should be hashed with bcrypt on the server.
