import { db } from "../db/index.js";
import { votes, voters } from "../db/schema.js";
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
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (biometricType !== "none" && !biometricPayload) {
      return res
        .status(400)
        .json({ error: "Biometric verification required" });
    }

    // 1. Block duplicate matric (per position)
    const existingByMatric = await db
      .select()
      .from(votes)
      .where(
        and(eq(votes.matricNo, matricNo), eq(votes.positionId, positionId))
      );

    if (existingByMatric.length > 0) {
      await logAbuse({
        matricNo,
        ipAddress,
        userAgent,
        action: "duplicate_vote_by_matric",
      });

      return res
        .status(403)
        .json({ error: "This matric has already voted for this position." });
    }

    // 2. Biometric enforcement (only if biometric is used)
    let biometricHash = null;

    if (biometricType !== "none") {
      biometricHash = hashBiometric(biometricPayload);

      const existingByBio = await db
        .select()
        .from(votes)
        .where(
          and(
            eq(votes.biometricHash, biometricHash),
            eq(votes.positionId, positionId)
          )
        );

      if (existingByBio.length > 0) {
        await logAbuse({
          matricNo,
          biometricHash,
          biometricType,
          ipAddress,
          userAgent,
          action: "duplicate_vote_by_biometric",
        });

        return res
          .status(403)
          .json({ error: "This biometric has already voted." });
      }
    }

    // 3. Insert vote
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

    return res.json({ success: true });
  } catch (err) {
    console.error("Vote submission error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
      }
