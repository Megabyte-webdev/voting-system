import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const pool = new pg.Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "afowebdev",
  database: "election_db",
});

const testConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();
    console.log("Database connection successful");
  } catch (err) {
    console.error("Database connection error:", err);
  }
};

testConnection();
export const db = drizzle(pool, { schema });
