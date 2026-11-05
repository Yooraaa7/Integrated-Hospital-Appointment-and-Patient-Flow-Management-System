const pool = require("../config/database");
const {
    expirePreviousDayQueues
} = require("../services/queueExpirationService");

async function main() {
    try {
        console.log("[Queue Expiration] Starting scheduled cleanup...");

        const result = await expirePreviousDayQueues();

        console.log("[Queue Expiration] Result:", result);
        process.exitCode = 0;
    } catch (error) {
        console.error("[Queue Expiration] Scheduled cleanup failed:", error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();