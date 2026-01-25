import express from "express";
import {
  getPositionsWithCandidates,
  submitVote,
} from "../controllers/vote.controller.js";
import { voteLimiter } from "../middlewares/rateLimiter.js";
import { validateVotePayload } from "../middlewares/validateVote.js";
import { electionGuard } from "../middlewares/electionGuard.js";
import { getActiveElection } from "../controllers/admin.controller.js";

const voteRoutes = express.Router();

voteRoutes.post(
  "/submit-vote",
  voteLimiter,
  validateVotePayload,
  electionGuard,
  submitVote,
);

voteRoutes.get("/positionsWithCandidate", getPositionsWithCandidates);

voteRoutes.get("/active-election", getActiveElection);
export default voteRoutes;
