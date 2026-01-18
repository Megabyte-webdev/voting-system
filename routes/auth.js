import { Router } from "express";
import { db } from "../db/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const authRoutes = Router();

/* =========================
   STUDENT LOGIN
========================= */
authRoutes.post("/login", async (req, res) => {
  const { matricNo, password } = req.body;

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.matricNo, matricNo),
  });

  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );

  res.json({ token });
});

/* =========================
   STUDENT SIGNUP
========================= */
authRoutes.post("/signup", async (req, res) => {
  const { name, matricNo, password } = req.body;

  // Check if matric number already exists
  const existing = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.matricNo, matricNo),
  });
  if (existing)
    return res.status(400).json({ message: "Matric number already exists" });

  // Hash password
  const hashed = await bcrypt.hash(password, 10);

  // Insert new user
  await db.insert(db.schema.users).values({
    name,
    matricNo,
    password: hashed,
    role: "student", // default role
  });

  res.status(201).json({ message: "Account created successfully" });
});

export default authRoutes;
