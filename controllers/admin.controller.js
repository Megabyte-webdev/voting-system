import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import {
  elections,
  positions,
  candidates,
  votes,
  abuseLogs,
  admins,
} from "../db/schema.js";
import { eq } from "drizzle-orm";
import sanitizeHtml from "sanitize-html";
import { uploadToCloudinary } from "../middlewares/imageUpload.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
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
  if (!d || typeof d !== "string") return false;
  // Accept format YYYY-MM-DDTHH:mm
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(d);
}

/* -------------------------
Create Admin
-------------------------- */
export const createAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password)
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });

    // hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const newAdmin = await db
      .insert(admins)
      .values({
        name,
        email,
        passwordHash,
        role: role || "admin",
      })
      .returning();

    res.json({ success: true, adminId: newAdmin[0].id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------------
Admin Login
-------------------------- */
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Correct query using eq()
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email)); // <- use eq() from drizzle-orm
    console.log(admin);

    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "12h" },
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

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
    const { positionId, name, manifesto } = req.body;
    const file = req.file; // multer

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

    let photoUrl = null;
    let photoPublicId = null;

    if (file) {
      const uploadResult = await uploadToCloudinary(file.buffer);
      photoUrl = uploadResult.url;
      photoPublicId = uploadResult.publicId;
    }

    const id = uuidv4();

    await db.insert(candidates).values({
      id,
      positionId,
      name: name.trim(),
      photo: photoUrl,
      photoPublicId,
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
        description: elections.description,
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
        description: elections.description,
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
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, id));
    if (!election) return res.status(404).json({ error: "Election not found" });

    const updatedFields = {};
    if (title) updatedFields.title = title.trim();
    if (description) updatedFields.description = description.trim();
    if (isSafeDate(startTime)) updatedFields.startTime = new Date(startTime);
    if (isSafeDate(endTime)) updatedFields.endTime = new Date(endTime);
    if (status) updatedFields.status = status;

    await db.update(elections).set(updatedFields).where(eq(elections.id, id));

    const [updatedElection] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, id));
    return res.json({ success: true, election: updatedElection });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update election" });
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
        positionName: positions.name,
        photo: candidates.photo,
        manifesto: candidates.manifesto,
      })
      .from(candidates)
      .innerJoin(positions, eq(candidates.positionId, positions.id)); // Join logic

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

/* -------------------- Delete Election -------------------- */
export async function deleteElection(req, res) {
  try {
    const { id } = req.params;
    if (!isUUID(id))
      return res.status(400).json({ error: "Invalid election ID." });

    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, id));

    if (!election)
      return res.status(404).json({ error: "Election not found." });

    // Delete positions and candidates under this election first (cascade)
    const electionPositions = await db
      .select({ id: positions.id })
      .from(positions)
      .where(eq(positions.electionId, id));

    for (const pos of electionPositions) {
      await db.delete(candidates).where(eq(candidates.positionId, pos.id));
    }

    await db.delete(positions).where(eq(positions.electionId, id));
    await db.delete(elections).where(eq(elections.id, id));

    return res.json({
      success: true,
      message: "Election deleted successfully.",
    });
  } catch (err) {
    console.error("deleteElection:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

/* -------------------- Delete Position -------------------- */
export async function deletePosition(req, res) {
  try {
    const { id } = req.params;
    if (!isUUID(id))
      return res.status(400).json({ error: "Invalid position ID." });

    const [position] = await db
      .select()
      .from(positions)
      .where(eq(positions.id, id));

    if (!position)
      return res.status(404).json({ error: "Position not found." });

    // Delete all candidates under this position
    await db.delete(candidates).where(eq(candidates.positionId, id));
    await db.delete(positions).where(eq(positions.id, id));

    return res.json({
      success: true,
      message: "Position deleted successfully.",
    });
  } catch (err) {
    console.error("deletePosition:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

/* -------------------- Update Candidate -------------------- */
export async function updateCandidate(req, res) {
  try {
    const { id } = req.params;
    const { name, manifesto } = req.body;
    const file = req.file; // multer

    if (!isUUID(id))
      return res.status(400).json({ error: "Invalid candidate ID." });

    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id));

    if (!candidate)
      return res.status(404).json({ error: "Candidate not found." });

    const updatedFields = {};

    if (isSafeText(name, 120)) updatedFields.name = name.trim();
    if (isSafeText(manifesto, 2000)) updatedFields.manifesto = manifesto.trim();

    if (file) {
      const uploadResult = await uploadToCloudinary(file.buffer);

      updatedFields.photo = uploadResult.url;
      updatedFields.photoPublicId = uploadResult.publicId;

      // Delete old image from Cloudinary if exists
      if (candidate.photoPublicId) {
        try {
          await cloudinary.v2.uploader.destroy(candidate.photoPublicId);
        } catch (err) {
          console.warn("Failed to delete old image:", err.message);
        }
      }
    }

    if (Object.keys(updatedFields).length === 0)
      return res.status(400).json({ error: "No valid fields to update." });

    await db.update(candidates).set(updatedFields).where(eq(candidates.id, id));

    const [updatedCandidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id));

    return res.json({ success: true, candidate: updatedCandidate });
  } catch (err) {
    console.error("updateCandidate:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

/* -------------------- Delete Candidate -------------------- */
export async function deleteCandidate(req, res) {
  try {
    const { id } = req.params;
    if (!isUUID(id))
      return res.status(400).json({ error: "Invalid candidate ID." });

    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id));

    if (!candidate)
      return res.status(404).json({ error: "Candidate not found." });

    // Delete the image from Cloudinary if it exists
    if (candidate.photoPublicId) {
      try {
        await cloudinary.v2.uploader.destroy(candidate.photoPublicId);
      } catch (err) {
        console.warn("Failed to delete candidate image:", err.message);
      }
    }

    // Delete candidate from DB
    await db.delete(candidates).where(eq(candidates.id, id));

    return res.json({
      success: true,
      message: "Candidate deleted successfully.",
    });
  } catch (err) {
    console.error("deleteCandidate:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}
