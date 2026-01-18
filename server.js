import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import voteRoutes from "./routes/vote.js";
import adminRoutes from "./routes/admin.js";
import dotenv from "dotenv";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/vote", voteRoutes);
app.use("/admin", adminRoutes);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
