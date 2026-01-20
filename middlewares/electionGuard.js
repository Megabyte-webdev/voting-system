import { db } from "../db/index.js";
import { elections } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function electionGuard(req, res, next) {
  const { electionId } = req.body;

  const [election] = await db
    .select()
    .from(elections)
    .where(eq(elections.id, electionId));

  if (!election) {
    return res.status(404).json({ error: "Election not found." });
  }

  const now = new Date();
  if (now < election.startTime || now > election.endTime) {
    return res.status(403).json({ error: "Voting is not open." });
  }

  req.election = election; // attach for controller
  next();
}
