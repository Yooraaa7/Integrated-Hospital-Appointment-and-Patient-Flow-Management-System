
require("dotenv").config();

const { Pool } = require("pg");

const requiredVariables = [
    "PGHOST",
    "PGDATABASE",
    "PGUSER",
    "PGPASSWORD"
];

for (const variable of requiredVariables) {
    if (!process.env[variable]) {
        throw new Error(`${variable} is missing from backend/.env`);
    }
}

const pool = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: {
        rejectUnauthorized: true
    },
    connectionTimeoutMillis: 10000
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL error:", error.message);
});

module.exports = pool;
