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

// Create a new election
export async function createElection(req, res) {
  try {
    const { title, startTime, endTime } = req.body;
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // Convert strings to Date objects
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format." });
    }
    const id = uuidv4();
    await db.insert(elections).values({
      id,
      title,
      startTime: startDate,
      endTime: endDate,
      status: "upcoming",
    });

    res.json({ success: true, electionId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
}

// Create a position for an election
export async function createPosition(req, res) {
  try {
    const { electionId, name } = req.body;
    if (!electionId || !name)
      return res.status(400).json({ error: "Missing required fields." });

    const id = uuidv4();
    await db.insert(positions).values({ id, electionId, name });

    res.json({ success: true, positionId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
}

// Create a candidate
export async function createCandidate(req, res) {
  try {
    const { positionId, name, photo, manifesto } = req.body;
    if (!positionId || !name)
      return res.status(400).json({ error: "Missing required fields." });

    const id = uuidv4();
    await db
      .insert(candidates)
      .values({ id, positionId, name, photo, manifesto });

    res.json({ success: true, candidateId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
}

// Close an election early
export async function closeElection(req, res) {
  try {
    const electionId = req.params.id;
    await db
      .update(elections)
      .set({ status: "closed" })
      .where(eq(elections.id, electionId));

    res.json({ success: true, message: "Election closed." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
}

export async function listElections(req, res) {
  try {
    const allElections = await db.select().from(elections);
    res.json({ elections: allElections });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
}

export async function listPositions(req, res) {
  try {
    // Optionally join with election title
    const allPositions = await db.select().from(positions);

    res.json({ positions: allPositions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
}
export async function listCandidates(req, res) {
  try {
    // Optionally join with election title
    const allCandidates = await db.select().from(candidates);

    res.json({ candidates: allCandidates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
}
// List all votes
export async function listVotes(req, res) {
  try {
    const allVotes = await db.select().from(votes);
    res.json({ votes: allVotes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
}

// List abuse logs
export async function listAbuseLogs(req, res) {
  try {
    const logs = await db.select().from(abuseLogs);
    res.json({ logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
}

// Activate an election
export const activateElection = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the election
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, id));

    if (!election) {
      return res
        .status(404)
        .json({ success: false, message: "Election not found" });
    }

    // Deactivate all other elections (if only one can be active)
    await db
      .update(elections)
      .set({ status: "upcoming" })
      .where(eq(elections.status, "active"));

    // Activate this election
    await db
      .update(elections)
      .set({ status: "active" })
      .where(eq(elections.id, id));

    return res.json({
      success: true,
      election: { ...election, status: "active" },
    });
  } catch (err) {
    console.error("Failed to activate election:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Deactivate an election
export const deactivateElection = async (req, res) => {
  try {
    const { id } = req.params;

    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, id));

    if (!election) {
      return res
        .status(404)
        .json({ success: false, message: "Election not found" });
    }

    // Set status to upcoming
    await db
      .update(elections)
      .set({ status: "upcoming" })
      .where(eq(elections.id, id));

    return res.json({
      success: true,
      election: { ...election, status: "upcoming" },
    });
  } catch (err) {
    console.error("Failed to deactivate election:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export async function getPositionsWithCandidates(req, res) {
  try {
    const { electionId } = req.query;

    // Fetch positions for this election
    const pos = await db
      .select()
      .from(positions)
      .where(eq(positions.electionId, electionId));

    // Fetch candidates for these positions
    const posWithCandidates = await Promise.all(
      pos.map(async (p) => {
        const cands = await db
          .select()
          .from(candidates)
          .where(eq(candidates.positionId, p.id));
        return { ...p, candidates: cands };
      }),
    );

    res.json({ positions: posWithCandidates });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to fetch positions with candidates" });
  }
}
