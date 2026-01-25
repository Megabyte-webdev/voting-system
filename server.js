import express from "express";
import cors from "cors";
import voteRoutes from "./routes/vote.routes.js";
import dotenv from "dotenv";
import adminRoutes from "./routes/admin.routes.js";
dotenv.config();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://ogun-students-election.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use("/api/vote", voteRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("Voting system server running");
});
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
