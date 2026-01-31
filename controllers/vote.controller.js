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
import { emitVoteUpdate } from "../services/socket.js";

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

    // 1. Fetch Position and Election context
    const [position] = await db
      .select({ electionId: positions.electionId })
      .from(positions)
      .where(eq(positions.id, positionId));

    if (!position) return res.status(404).json({ error: "Position not found." });

    // 2. Process Biometric Hash
    let biometricHash = null;
    if (biometricType !== "none" && biometricPayload) {
      // FIX: Assign to the outer variable, do not use 'const' here
      biometricHash = hashBiometric(biometricPayload);
    }

    // 3. MULTI-LAYER CHECK (Matric + Biometric)
    // We check both in a single query for efficiency
    const existingVotes = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.positionId, positionId),
          // Check if either the matric OR the biometric hash already exists
          biometricHash 
            ? or(eq(votes.matricNo, matricNo), eq(votes.biometricHash, biometricHash))
            : eq(votes.matricNo, matricNo)
        )
      );

    if (existingVotes.length > 0) {
      const isBiometricMatch = existingVotes.some(v => v.biometricHash === biometricHash);
      
      await logAbuse({
        matricNo,
        action: isBiometricMatch ? "duplicate_biometric" : "duplicate_matric",
        ipAddress
      });

      return res.status(403).json({
        error: "You have already cast a vote for this position."
      });
    }

    // 4. ATOMIC INSERTION
    await db.insert(votes).values({
      matricNo,
      biometricHash, // Now correctly contains the hash, not null
      biometricType,
      deviceId,
      positionId,
      candidateId,
      ipAddress,
      userAgent,
      createdAt: new Date(),
    });

    emitVoteUpdate(position.electionId, { positionId, candidateId, increment: 1 });

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
