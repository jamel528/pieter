import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import instructionRoutes from "./routes/instructions.js";
import responseRoutes from "./routes/responses.js";
import { initializeDatabase } from "./db/init.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/instructions", instructionRoutes);
app.use("/api", responseRoutes);

// Initialize database
initializeDatabase();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
