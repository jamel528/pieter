import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db/init.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await db.getAsync("SELECT * FROM users WHERE username = ?", [
      username,
    ]);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || "your-secret-key-change-this-in-production",
      { expiresIn: "7d" }
    );

    res.json({ token, username: user.username });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Change credentials
router.post("/change-credentials", auth, async (req, res) => {
  const { currentPassword, newPassword, newUsername } = req.body;

  try {
    const user = await db.getAsync("SELECT * FROM users WHERE id = ?", [
      req.user.id,
    ]);

    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const updates = [];
    const params = [];

    if (newUsername && newUsername !== user.username) {
      // Check if new username is already taken
      const existingUser = await db.getAsync(
        "SELECT * FROM users WHERE username = ?",
        [newUsername]
      );
      if (existingUser) {
        return res.status(400).json({ error: "Username is already taken" });
      }
      updates.push("username = ?");
      params.push(newUsername);
    }

    if (newPassword) {
      updates.push("password = ?");
      params.push(bcrypt.hashSync(newPassword, 10));
    }

    if (updates.length > 0) {
      params.push(req.user.id);
      await db.runAsync(
        `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
        params
      );
      res.json({ message: "Credentials updated successfully" });
    } else {
      res.status(400).json({ error: "No changes requested" });
    }
  } catch (error) {
    console.error("Change credentials error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get email settings
router.get("/settings", auth, async (req, res) => {
  try {
    const settings = await db.getAsync("SELECT * FROM settings LIMIT 1");
    res.json({
      report_email: settings.report_email,
      rejection_email: settings.rejection_email,
    });
  } catch (error) {
    console.error("Error fetching email settings:", error);
    res.status(500).json({ error: "Failed to fetch email settings" });
  }
});

// Update email settings
router.put("/settings", auth, async (req, res) => {
  const { report_email, rejection_email } = req.body;

  if (!report_email || !rejection_email) {
    return res.status(400).json({ error: "Both email addresses are required" });
  }

  try {
    await db.runAsync(
      "UPDATE settings SET report_email = ?, rejection_email = ?, updated_at = CURRENT_TIMESTAMP",
      [report_email, rejection_email]
    );
    res.json({ message: "Email settings updated successfully" });
  } catch (error) {
    console.error("Error updating email settings:", error);
    res.status(500).json({ error: "Failed to update email settings" });
  }
});

export default router;
