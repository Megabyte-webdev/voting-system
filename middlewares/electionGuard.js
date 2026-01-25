import { db } from "../db/index.js";
import { elections } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function electionGuard(req, res, next) {
  const [activeElection] = await db
    .select({ id: elections.id, title: elections.title })
    .from(elections)
    .where(eq(elections.status, "active"))
    .limit(1);

  if (!activeElection) {
    return res.status(404).json({ error: "Election not found." });
  }

  const now = new Date();
  if (now < activeElection.startTime || now > activeElection.endTime) {
    return res.status(403).json({ error: "Voting is not open." });
  }

  next();
}
