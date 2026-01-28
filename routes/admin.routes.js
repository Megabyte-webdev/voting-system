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
  updateElection,
  // New imports
  deleteElection,
  deletePosition,
  updateCandidate,
  deleteCandidate,
  createAdmin,
  adminLogin,
} from "../controllers/admin.controller.js";
import upload from "../middlewares/multer.js";

const adminRoutes = express.Router();

adminRoutes.post("/login", adminLogin);

adminRoutes.post("/create", createAdmin);
// Protect all admin routes
adminRoutes.use(adminAuth);

/* -------------------- Election Management -------------------- */
adminRoutes.post("/elections", createElection);
adminRoutes.post("/positions", createPosition);
adminRoutes.post("/elections/:id/close", closeElection);
adminRoutes.patch("/:id/activate", activateElection);
adminRoutes.patch("/:id/deactivate", deactivateElection);
adminRoutes.patch("/elections/:id", updateElection);

adminRoutes.post("/candidates", upload.single("photo"), createCandidate);
adminRoutes.patch("/candidates/:id", upload.single("photo"), updateCandidate);

/* -------------------- New CRUD Routes -------------------- */
// Delete election
adminRoutes.delete("/elections/:id", deleteElection);

// Delete position
adminRoutes.delete("/positions/:id", deletePosition);

// Delete candidate
adminRoutes.delete("/candidates/:id", deleteCandidate);

/* -------------------- Audit / Listing -------------------- */
adminRoutes.get("/votes", listVotes);
adminRoutes.get("/abuse-logs", listAbuseLogs);
adminRoutes.get("/elections", listElections);
adminRoutes.get("/positions", listPositions);
adminRoutes.get("/candidates", listCandidates);

export default adminRoutes;
