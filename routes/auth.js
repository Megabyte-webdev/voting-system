import { Router } from "express";
import { db } from "../db/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const authRoutes = Router();

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

export default authRoutes;
