import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import {
  elections,
  positions,
  candidates,
  votes,
  abuseLogs,
} from "../db/schema.js";
import { eq } from "drizzle-orm";
import sanitizeHtml from "sanitize-html";

/* -------------------- Security Utilities -------------------- */

const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;

function isUUID(v) {
  return typeof v === "string" && UUID_REGEX.test(v);
}

function isSafeText(str, max = 255) {
  if (typeof str !== "string") return null;

  const clean = sanitizeHtml(str, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

  if (clean.length === 0 || clean.length > max) return null;
  return clean;
}

function isSafeDate(d) {
  const dt = new Date(d);
  return !isNaN(dt.getTime());
}

/* -------------------- Create Election -------------------- */

export async function createElection(req, res) {
  try {
    const { title, startTime, endTime, description } = req.body;

    if (
      !isSafeText(title, 150) ||
      !isSafeText(description, 255) ||
      !isSafeDate(startTime) ||
      !isSafeDate(endTime)
    ) {
      return res.status(400).json({ error: "Invalid or malicious input." });
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (startDate >= endDate) {
      return res
        .status(400)
        .json({ error: "End time must be after start time." });
    }

    const id = uuidv4();

    await db.insert(elections).values({
      id,
      title: title.trim(),
      startTime: startDate,
      endTime: endDate,
      description: description.trim(),
      status: "upcoming",
    });

    return res.json({ success: true, electionId: id });
  } catch (err) {
    console.error("createElection:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

/* -------------------- Create Position -------------------- */

export async function createPosition(req, res) {
  try {
    const { electionId, name } = req.body;

    if (!isUUID(electionId) || !isSafeText(name, 100)) {
      return res.status(400).json({ error: "Invalid input." });
    }

    const [election] = await db
      .select({ id: elections.id })
      .from(elections)
      .where(eq(elections.id, electionId));

    if (!election) {
      return res.status(404).json({ error: "Election not found." });
    }

    const id = uuidv4();

    await db.insert(positions).values({
      id,
      electionId,
      name: name.trim(),
    });

    return res.json({ success: true, positionId: id });
  } catch (err) {
    console.error("createPosition:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

/* -------------------- Create Candidate -------------------- */

export async function createCandidate(req, res) {
  try {
    const { positionId, name, photo, manifesto } = req.body;

    if (!isUUID(positionId) || !isSafeText(name, 120)) {
      return res.status(400).json({ error: "Invalid input." });
    }

    const [position] = await db
      .select({ id: positions.id })
      .from(positions)
      .where(eq(positions.id, positionId));

    if (!position) {
      return res.status(404).json({ error: "Position not found." });
    }

    const id = uuidv4();

    await db.insert(candidates).values({
      id,
      positionId,
      name: name.trim(),
      photo: isSafeText(photo, 500) ? photo.trim() : null,
      manifesto: isSafeText(manifesto, 2000) ? manifesto.trim() : null,
    });

    return res.json({ success: true, candidateId: id });
  } catch (err) {
    console.error("createCandidate:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

/* -------------------- Close Election -------------------- */

export async function closeElection(req, res) {
  try {
    const electionId = req.params.id;

    if (!isUUID(electionId)) {
      return res.status(400).json({ error: "Invalid election ID." });
    }

    const [election] = await db
      .select({ id: elections.id })
      .from(elections)
      .where(eq(elections.id, electionId));

    if (!election) {
      return res.status(404).json({ error: "Election not found." });
    }

    await db
      .update(elections)
      .set({ status: "closed" })
      .where(eq(elections.id, electionId));

    return res.json({ success: true, message: "Election closed." });
  } catch (err) {
    console.error("closeElection:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

/* -------------------- List Elections (Safe Fields) -------------------- */

export async function listElections(req, res) {
  try {
    const allElections = await db
      .select({
        id: elections.id,
        title: elections.title,
        startTime: elections.startTime,
        endTime: elections.endTime,
        status: elections.status,
      })
      .from(elections);

    return res.json({ elections: allElections });
  } catch (err) {
    console.error("listElections:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

/* -------------------- Get Active Election -------------------- */

export async function getActiveElection(req, res) {
  try {
    const [activeElection] = await db
      .select({
        id: elections.id,
        title: elections.title,
        startTime: elections.startTime,
        endTime: elections.endTime,
        status: elections.status,
      })
      .from(elections)
      .where(eq(elections.status, "active"))
      .limit(1);

    if (!activeElection) {
      return res.status(404).json({ error: "No active election found." });
    }

    return res.json({ election: activeElection });
  } catch (err) {
    console.error("getActiveElection:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

/* -------------------- Activate Election (Race Safe) -------------------- */

export async function activateElection(req, res) {
  try {
    const { id } = req.params;

    if (!isUUID(id)) {
      return res.status(400).json({ error: "Invalid election ID." });
    }

    const [election] = await db
      .select({ id: elections.id })
      .from(elections)
      .where(eq(elections.id, id));

    if (!election) {
      return res.status(404).json({ error: "Election not found." });
    }

    await db.transaction(async (tx) => {
      await tx.update(elections).set({ status: "upcoming" });
      await tx
        .update(elections)
        .set({ status: "active" })
        .where(eq(elections.id, id));
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("activateElection:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}
export async function updateElection(req, res) {
  const { id } = req.params;
  const { title, startTime, endTime, status, description } = req.body;

  try {
    // Check if election exists
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, id));

    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }

    // Prepare fields to update
    const updatedFields = {};
    if (isSafeText(title)) updatedFields.title = title;
    if (isSafeDate(startTime)) updatedFields.startTime = new Date(startTime);
    if (isSafeDate(endTime)) updatedFields.endTime = new Date(endTime);
    if (status) updatedFields.status = status;
    if (isSafeText(description)) updatedFields.description = description;

    // Update in DB
    await db.update(elections).set(updatedFields).where(eq(elections.id, id));

    // Return updated election
    const [updatedElection] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, id));

    res.json({ success: true, election: updatedElection });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update election" });
  }
}

/* -------------------- Deactivate Election -------------------- */

export async function deactivateElection(req, res) {
  try {
    const { id } = req.params;

    if (!isUUID(id)) {
      return res.status(400).json({ error: "Invalid election ID." });
    }

    const [election] = await db
      .select({ id: elections.id })
      .from(elections)
      .where(eq(elections.id, id));

    if (!election) {
      return res.status(404).json({ error: "Election not found." });
    }

    await db
      .update(elections)
      .set({ status: "upcoming" })
      .where(eq(elections.id, id));

    return res.json({ success: true });
  } catch (err) {
    console.error("deactivateElection:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

/******************** List Candidates (Safe Fields) ********************/

export async function listCandidates(req, res) {
  try {
    const allCandidates = await db
      .select({
        id: candidates.id,
        name: candidates.name,
        positionId: candidates.positionId,
        photo: candidates.photo,
        manifesto: candidates.manifesto,
      })
      .from(candidates);

    return res.json({ candidates: allCandidates });
  } catch (err) {
    console.error("listCandidates:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}
/******************** List Positions (Safe Fields) ********************/

export async function listPositions(req, res) {
  try {
    const allPositions = await db
      .select({
        id: positions.id,
        name: positions.name,
        electionId: positions.electionId,
      })
      .from(positions);

    return res.json({ positions: allPositions });
  } catch (err) {
    console.error("listPositions:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

export async function listVotes(req, res) {
  try {
    const allVotes = await db
      .select({
        id: votes.id,
        userId: votes.deviceId, // anonymized identifier instead of matricNo
        candidateId: votes.candidateId,
        positionId: votes.positionId,
        createdAt: votes.createdAt,
      })
      .from(votes);

    // Optionally, join with candidate and position names for readability
    const enrichedVotes = await Promise.all(
      allVotes.map(async (v) => {
        const [candidate] = await db
          .select({ name: candidates.name })
          .from(candidates)
          .where(eq(candidates.id, v.candidateId));

        const [position] = await db
          .select({ name: positions.name })
          .from(positions)
          .where(eq(positions.id, v.positionId));

        return {
          id: v.id,
          userId: v.userId,
          candidate: candidate ? candidate.name : null,
          position: position ? position.name : null,
          createdAt: v.createdAt,
        };
      }),
    );

    return res.json({ votes: enrichedVotes });
  } catch (err) {
    console.error("listVotes:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

// List Abuse Logs (correct columns)
export async function listAbuseLogs(req, res) {
  try {
    const logs = await db
      .select({
        id: abuseLogs.id,
        matricNo: abuseLogs.matricNo,
        biometricHash: abuseLogs.biometricHash,
        biometricType: abuseLogs.biometricType,
        deviceId: abuseLogs.deviceId,
        ipAddress: abuseLogs.ipAddress,
        userAgent: abuseLogs.userAgent,
        action: abuseLogs.action,
        occurredAt: abuseLogs.occurredAt,
      })
      .from(abuseLogs);

    return res.json({ logs });
  } catch (err) {
    console.error("listAbuseLogs:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}
