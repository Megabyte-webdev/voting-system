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

    // 1. Block duplicate matric
    const existingByMatric = await db
      .select()
      .from(votes)
      .where(
        and(eq(votes.matricNo, matricNo), eq(votes.positionId, positionId)),
      );

    if (existingByMatric.length > 0) {
      await logAbuse({
        matricNo,
        ipAddress,
        userAgent,
        action: "duplicate_vote_by_matric",
      });

      return res.status(403).json({ error: "This matric has already voted." });
    }

    // 2. Biometric enforcement
    let biometricHash = null;

    if (biometricType !== "none") {
      biometricHash = hashBiometric(biometricPayload);

      const existingByBio = await db
        .select()
        .from(votes)
        .where(
          and(
            eq(votes.biometricHash, biometricHash),
            eq(votes.positionId, positionId),
          ),
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

        return res.status(403).json({ error: "Biometric already used." });
      }
    }

    // 3. Fallback device lock
    if (biometricType === "none") {
      const deviceVotes = await db
        .select()
        .from(votes)
        .where(eq(votes.deviceId, deviceId));

      if (deviceVotes.length >= 2) {
        await logAbuse({
          matricNo,
          deviceId,
          ipAddress,
          userAgent,
          action: "device_vote_limit_reached",
        });

        return res
          .status(403)
          .json({ error: "Too many votes from this device." });
      }
    }

    // 4. Insert vote
    await db.insert(votes).values({
      matricNo,
      biometricHash,
      biometricType,
      deviceId,
      candidateId,
      positionId,
    });

    // 5. Lock voter identity
    await db.insert(voters).values({
      matricNo,
      biometricHash,
      biometricType,
      deviceId,
      ipAddress,
      userAgent,
    });

    return res.json({ success: true, message: "Vote submitted." });
  } catch (err) {
    console.error("Vote error:", err);

    if (err.code === "23505") {
      return res.status(409).json({ error: "Duplicate vote detected." });
    }

    return res.status(500).json({ error: "Internal server error." });
  }
}
