import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import voteRoutes from "./routes/vote.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import dotenv from "dotenv";
import { initSocket } from "./services/socket.js"; // helper to broadcast

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://ogun-students-election.vercel.app",
    ],
    credentials: true,
  }),
);

app.use("/api/vote", voteRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("Voting system server running");
});

// Start server
const PORT = process.env.PORT || 5000;

initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
