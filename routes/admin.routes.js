import express from "express";
import { adminAuth } from "../middlewares/adminAuth.js";
import {
  activateElection,
  closeElection,
  createCandidate,
  createElection,
  createPosition,
  deactivateElection,
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
adminRoutes.patch("/:id/activate", activateElection);
adminRoutes.patch("/:id/deactivate", deactivateElection);

// Audit endpoints
adminRoutes.get("/votes", listVotes);
adminRoutes.get("/abuse-logs", listAbuseLogs);
adminRoutes.get("/elections", listElections);
adminRoutes.get("/positions", listPositions);
adminRoutes.get("/candidates", listCandidates);

export default adminRoutes;
