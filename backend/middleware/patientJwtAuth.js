const jwt = require("jsonwebtoken");

function requirePatientJwt(req, res, next) {
    const authorization = req.get("authorization") || "";
    const match = /^Bearer\s+(.+)$/i.exec(authorization);

    if (!match) {
        return res.status(401).json({
            success: false,
            code: "PATIENT_AUTH_REQUIRED",
            message: "Please log in to your patient account."
        });
    }

    const patientJwtSecret = process.env.PATIENT_JWT_SECRET;

    if (!patientJwtSecret) {
        console.error("PATIENT_JWT_SECRET is not configured.");

        return res.status(500).json({
            success: false,
            code: "PATIENT_AUTH_NOT_CONFIGURED",
            message: "Patient authentication is not configured."
        });
    }

    try {
        const claims = jwt.verify(
            match[1],
            patientJwtSecret,
            { algorithms: ["HS256"] }
        );

        if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
            return res.status(401).json({
                success: false,
                code: "INVALID_PATIENT_TOKEN",
                message: "Invalid patient session."
            });
        }

        const role = claims.role ?? claims.user_role;

        if (
            role !== undefined &&
            String(role).toUpperCase() !== "PATIENT"
        ) {
            return res.status(403).json({
                success: false,
                code: "PATIENT_ROLE_REQUIRED",
                message: "This endpoint requires patient authentication."
            });
        }

        const rawPatientId =
            claims.patient_id ??
            claims.patientId ??
            claims.id ??
            claims.sub;

        const patientId = String(rawPatientId ?? "");

        // Corrected regex
        if (!/^[1-9]\d*$/.test(patientId)) {
            return res.status(401).json({
                success: false,
                code: "INVALID_PATIENT_CLAIMS",
                message: "The patient token does not contain a valid patient ID."
            });
        }

        req.patient = {
            id: patientId
        };

        next();

    } catch (error) {
        console.error("Patient JWT verification failed:", error.message);

        return res.status(401).json({
            success: false,
            code: "INVALID_PATIENT_TOKEN",
            message: "Patient session expired or invalid."
        });
    }
}

module.exports = { requirePatientJwt };
