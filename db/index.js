import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_URL,
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
