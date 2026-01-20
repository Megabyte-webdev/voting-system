// drizzle.config.ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.POSTGRES_URL_UNPOOLED ?? process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error(
    "❌ DATABASE_URL_UNPOOLED or DATABASE_URL must be set in environment variables.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.js",
  out: "./drizzle", // migration output folder
  dbCredentials: {
    url: databaseUrl,
  },
});
