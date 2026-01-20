import { db } from "../db/index.js";
import { abuseLogs } from "../db/schema.js";

export async function logAbuse(payload) {
  await db.insert(abuseLogs).values(payload);
}
