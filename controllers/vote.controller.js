import { db } from "../db/index.js";
import {
  votes,
  voters,
  elections,
  positions,
  candidates,
} from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { hashBiometric } from "../services/biometric.service.js";
import { logAbuse } from "../services/abuse.service.js";

export async function submitVote(req, res) {
  try {
    const {
      matricNo,
      biometricType,
      biometricPayload,
      deviceId,
      positionId,
      candidateId,
    } = req.body;

    const ipAddress = req.ip;
    const userAgent = req.headers["user-agent"] || null;

    // 0. REQUIRED FIELD VALIDATION
    if (
      !matricNo ||
      !deviceId ||
      !positionId ||
      !candidateId ||
      !biometricType
    ) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    if (biometricType !== "none" && !biometricPayload) {
      return res
        .status(400)
        .json({ error: "Biometric verification required." });
    }

    // 1. Fetch the election ID from the position
    const [position] = await db
      .select({ electionId: positions.electionId })
      .from(positions)
      .where(eq(positions.id, positionId));

    if (!position) {
      return res.status(404).json({ error: "Position not found." });
    }

    const electionId = position.electionId;

    // 2. Block duplicate matric (per election)
    const existingVoteForPosition = await db
      .select()
      .from(votes)
      .where(
        and(eq(votes.matricNo, matricNo), eq(votes.positionId, positionId)),
      );

    if (existingVoteForPosition.length > 0) {
      await logAbuse({
        matricNo,
        ipAddress,
        userAgent,
        action: "duplicate_vote_by_matric_for_position",
      });

      return res.status(403).json({
        error: "You have already voted for this position.",
      });
    }

    // 3. Biometric enforcement (per election)
    let biometricHash = null;

    if (biometricType !== "none") {
      const biometricHash = hashBiometric(biometricPayload);

      const existingBioForPosition = await db
        .select()
        .from(votes)
        .where(
          and(
            eq(votes.biometricHash, biometricHash),
            eq(votes.positionId, positionId),
          ),
        );

      if (existingBioForPosition.length > 0) {
        await logAbuse({
          matricNo,
          biometricHash,
          biometricType,
          ipAddress,
          userAgent,
          action: "duplicate_vote_by_biometric_for_position",
        });

        return res.status(403).json({
          error: "This fingerprint has already been used for this position.",
        });
      }
    }

    // 4. Insert vote
    await db.insert(votes).values({
      matricNo,
      biometricHash,
      biometricType,
      deviceId,
      positionId,
      candidateId,
      ipAddress,
      userAgent,
      createdAt: new Date(),
    });

    return res.json({ success: true, message: "Vote submitted successfully." });
  } catch (err) {
    console.error("Vote submission error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

/* -------------------- Get Positions + Candidates (Active Election) -------------------- */

export async function getPositionsWithCandidates(req, res) {
  try {
    const [activeElection] = await db
      .select({ id: elections.id, title: elections.title })
      .from(elections)
      .where(eq(elections.status, "active"))
      .limit(1);

    if (!activeElection) {
      return res.status(404).json({ error: "No active election found." });
    }

    const rows = await db
      .select({
        posId: positions.id,
        posName: positions.name,
        candId: candidates.id,
        candName: candidates.name,
        candPhoto: candidates.photo,
        candManifesto: candidates.manifesto,
      })
      .from(positions)
      .leftJoin(candidates, eq(candidates.positionId, positions.id))
      .where(eq(positions.electionId, activeElection.id));

    const grouped = {};

    for (const r of rows) {
      if (!grouped[r.posId]) {
        grouped[r.posId] = {
          id: r.posId,
          name: r.posName,
          candidates: [],
        };
      }

      if (r.candId) {
        grouped[r.posId].candidates.push({
          id: r.candId,
          name: r.candName,
          photo: r.candPhoto,
          manifesto: r.candManifesto,
        });
      }
    }

    return res.json({
      election: activeElection,
      positions: Object.values(grouped),
    });
  } catch (err) {
    console.error("getPositionsWithCandidates:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}
