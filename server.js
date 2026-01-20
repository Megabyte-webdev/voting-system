import express from "express";
import cors from "cors";
import voteRoutes from "./routes/vote.routes.js";
import dotenv from "dotenv";
import adminRoutes from "./routes/admin.routes.js";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/vote", voteRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("Voting system server running");
});
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
