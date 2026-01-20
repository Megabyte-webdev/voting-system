import express from "express";
import { adminAuth } from "../middlewares/adminAuth.js";
import {
  closeElection,
  createCandidate,
  createElection,
  createPosition,
  listAbuseLogs,
  listCandidates,
  listElections,
  listPositions,
  listVotes,
} from "../controllers/admin.controller.js";

const adminRoutes = express.Router();

// Protect all admin routes
adminRoutes.use(adminAuth);

// Election management
adminRoutes.post("/elections", createElection);
adminRoutes.post("/positions", createPosition);
adminRoutes.post("/candidates", createCandidate);
adminRoutes.post("/elections/:id/close", closeElection);

// Audit endpoints
adminRoutes.get("/votes", listVotes);
adminRoutes.get("/abuse-logs", listAbuseLogs);
adminRoutes.get("/elections", listElections);
adminRoutes.get("/positions", listPositions);
adminRoutes.get("/candidates", listCandidates);

export default adminRoutes;
