import express from "express";
import { submitVote } from "../controllers/vote.controller.js";
import { voteLimiter } from "../middlewares/rateLimiter.js";
import { validateVotePayload } from "../middlewares/validateVote.js";
import { electionGuard } from "../middlewares/electionGuard.js";

const voteRoutes = express.Router();

voteRoutes.post(
  "/submit-vote",
  voteLimiter,
  validateVotePayload,
  electionGuard,
  submitVote,
);

export default voteRoutes;
