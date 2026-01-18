import express from "express";
import { db } from "../db/index.js";
import { elections, positions, candidates, votes } from "../db/schema.js";
import { auth } from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/adminOnly.js";
import { eq, sql } from "drizzle-orm";

const adminRoutes = express.Router();

/* ==============================
   ELECTIONS
================================ */

// Create election
adminRoutes.post("/elections", auth, adminOnly, async (req, res) => {
  const { title, startTime, endTime } = req.body;

  await db.insert(elections).values({
    title,
    startTime,
    endTime,
  });

  res.status(201).json({ message: "Election created" });
});

// Get all elections
adminRoutes.get("/elections", auth, adminOnly, async (_, res) => {
  const data = await db.select().from(elections);
  res.json(data);
});

/* ==============================
   POSITIONS
================================ */

adminRoutes.post("/positions", auth, adminOnly, async (req, res) => {
  const { electionId, name } = req.body;

  await db.insert(positions).values({
    electionId,
    name,
  });

  res.status(201).json({ message: "Position added" });
});

adminRoutes.get("/positions/:electionId", auth, adminOnly, async (req, res) => {
  const data = await db
    .select()
    .from(positions)
    .where(eq(positions.electionId, req.params.electionId));

  res.json(data);
});

/* ==============================
   CANDIDATES
================================ */

adminRoutes.post("/candidates", auth, adminOnly, async (req, res) => {
  const { positionId, name, manifesto } = req.body;

  await db.insert(candidates).values({
    positionId,
    name,
    manifesto,
  });

  res.status(201).json({ message: "Candidate added" });
});

adminRoutes.get(
  "/candidates/:positionId",
  auth,
  adminOnly,
  async (req, res) => {
    const data = await db
      .select()
      .from(candidates)
      .where(eq(candidates.positionId, req.params.positionId));

    res.json(data);
  },
);

/* ==============================
   RESULTS
================================ */

adminRoutes.get("/results/:positionId", auth, adminOnly, async (req, res) => {
  const { positionId } = req.params;

  const results = await db
    .select({
      candidateId: candidates.id,
      name: candidates.name,
      totalVotes: sql`COUNT(${votes.id})`.as("totalVotes"),
    })
    .from(candidates)
    .leftJoin(votes, eq(votes.candidateId, candidates.id))
    .where(eq(candidates.positionId, positionId))
    .groupBy(candidates.id);

  res.json(results);
});

/* ==============================
   DELETE (OPTIONAL)
================================ */

adminRoutes.delete("/candidates/:id", auth, adminOnly, async (req, res) => {
  await db.delete(candidates).where(eq(candidates.id, req.params.id));
  res.json({ message: "Candidate deleted" });
});

adminRoutes.delete("/positions/:id", auth, adminOnly, async (req, res) => {
  await db.delete(positions).where(eq(positions.id, req.params.id));
  res.json({ message: "Position deleted" });
});

adminRoutes.delete("/elections/:id", auth, adminOnly, async (req, res) => {
  await db.delete(elections).where(eq(elections.id, req.params.id));
  res.json({ message: "Election deleted" });
});

export default adminRoutes;
