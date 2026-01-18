import { Router } from "express";
const voteRoutes = Router();
import { db } from "../db/index.js";
import { votes } from "../db/schema.js";
import { auth } from "../middlewares/auth.js";

voteRoutes.post("/", auth, async (req, res) => {
  const { candidateId, positionId } = req.body;

  try {
    await db.insert(votes).values({
      userId: req.user.id,
      candidateId,
      positionId,
    });

    res.json({ message: "Vote cast successfully" });
  } catch (err) {
    res.status(400).json({
      message: "You have already voted for this position",
    });
  }
});

export default voteRoutes;
