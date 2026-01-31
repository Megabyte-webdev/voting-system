// services/socket.js
import { Server } from "socket.io";
import { db } from "../db/index.js";
import { elections, votes, positions, candidates } from "../db/schema.js";
import { eq } from "drizzle-orm";

let io;

/**
 * Initialize Socket.IO server
 */
export async function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://ogun-students-election.vercel.app",
      ],
      credentials: true,
    },
  });

  io.on("connection", async (socket) => {
    console.log("Client connected:", socket.id);

    try {
      // Fetch active election automatically
      const [activeElection] = await db
        .select({ id: elections.id })
        .from(elections)
        .where(eq(elections.status, "active"))
        .limit(1);

      if (activeElection) {
        const room = `election:${activeElection.id}`;
        socket.join(room);
        console.log(`Client ${socket.id} joined active election room: ${room}`);

        // Fetch initial votes per position + candidate
        const voteRows = await db
          .select({
            positionId: positions.id,
            candidateId: candidates.id,
          })
          .from(votes)
          .leftJoin(positions, eq(positions.id, votes.positionId))
          .leftJoin(candidates, eq(candidates.id, votes.candidateId))
          .where(eq(positions.electionId, activeElection.id));

        // Aggregate vote counts per candidate
        const voteSummary = {};
        for (const row of voteRows) {
          if (!voteSummary[row.positionId]) voteSummary[row.positionId] = {};
          if (!voteSummary[row.positionId][row.candidateId])
            voteSummary[row.positionId][row.candidateId] = 0;
          voteSummary[row.positionId][row.candidateId] += 1;
        }

        // Emit initial vote summary to connecting client only
        io.to(socket.id).emit("vote:update:init", { voteSummary });
      }
    } catch (err) {
      console.error("Error fetching active election for socket:", err);
    }

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
}

/**
 * Emit vote update to all clients in the active election
 * payload = { positionId, candidateId, increment: 1 }
 */
export async function emitVoteUpdate(payload) {
  if (!io) return;

  try {
    const [activeElection] = await db
      .select({ id: elections.id })
      .from(elections)
      .where(eq(elections.status, "active"))
      .limit(1);

    if (!activeElection) return;

    const room = `election:${activeElection.id}`;

    // Fetch updated votes for the election
    const voteRows = await db
      .select({
        positionId: positions.id,
        candidateId: candidates.id,
      })
      .from(votes)
      .leftJoin(positions, eq(positions.id, votes.positionId))
      .leftJoin(candidates, eq(candidates.id, votes.candidateId))
      .where(eq(positions.electionId, activeElection.id));

    // Aggregate vote counts per candidate
    const voteSummary = {};
    for (const row of voteRows) {
      if (!voteSummary[row.positionId]) voteSummary[row.positionId] = {};
      if (!voteSummary[row.positionId][row.candidateId])
        voteSummary[row.positionId][row.candidateId] = 0;
      voteSummary[row.positionId][row.candidateId] += 1;
    }

    io.to(room).emit("vote:update", { voteSummary });
    console.log("Emitted vote update to room:", room);
  } catch (err) {
    console.error("Error emitting vote update:", err);
  }
}
