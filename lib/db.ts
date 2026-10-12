import { Pool } from "pg";

declare global {
  var _pgPool: Pool | undefined;
}

let pool: Pool;

if (!global._pgPool) {
  global._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
  });
}

pool = global._pgPool;

export default pool;
