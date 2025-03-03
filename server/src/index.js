import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import instructionRoutes from "./routes/instructions.js";
import responseRoutes from "./routes/responses.js";
import { initializeDatabase } from "./db/init.js";
import path from "path";

dotenv.config();

const app = express();

const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../client/dist")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/instructions", instructionRoutes);
app.use("/api", responseRoutes);

const __dirname = path.resolve();

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

// Initialize database
initializeDatabase();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
