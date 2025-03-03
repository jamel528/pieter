import express from "express";
import { auth } from "../middleware/auth.js";
import db from "../db/init.js";
import nodemailer from "nodemailer";

const router = express.Router();

// Get all instructions
router.get("/", async (req, res) => {
  try {
    const instructions = await db.allAsync(
      "SELECT * FROM instructions ORDER BY order_index ASC"
    );
    res.json(instructions);
  } catch (error) {
    console.error("Get instructions error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create instruction (protected)
router.post("/", auth, async (req, res) => {
  const { title, content, device, video_url } = req.body;

  try {
    // Get the highest order_index
    const maxOrder = await db.getAsync(
      "SELECT MAX(order_index) as maxOrder FROM instructions"
    );
    const newOrderIndex = (maxOrder?.maxOrder || 0) + 1;

    await db.runAsync(
      "INSERT INTO instructions (title, content, device, video_url, order_index) VALUES (?, ?, ?, ?, ?)",
      [title, content, device, video_url, newOrderIndex]
    );

    const newInstruction = await db.getAsync(
      "SELECT * FROM instructions WHERE id = last_insert_rowid()"
    );

    res.status(201).json(newInstruction);
  } catch (error) {
    console.error("Create instruction error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Submit a test response
router.post("/:id/response", async (req, res) => {
  try {
    const { approved, remark, testNumber, testRunId, testerName } = req.body;
    const instructionId = req.params.id;
    const { title: testTitle } = await db.getAsync(
      "SELECT title FROM instructions WHERE id = ?",
      [instructionId]
    );

    if (!approved) {
      // Send email to notify admin
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from:
          '"Test Instruction Management System" <' +
          process.env.EMAIL_USER +
          ">",
        to: "jamel.nobles528@gmail.com",
        subject: `Test Rejected for ${testerName}`,
        html: `
          <p>A test was rejected for ${testerName} with the following remark:</p>
          <blockquote>${remark}</blockquote>
          <p>The test title is: ${testTitle} and the test number is: ${testNumber}</p>
        `,
      };

      await transporter.sendMail(mailOptions);
    }

    await db.runAsync(
      `INSERT INTO test_responses (instruction_id, test_run_id, tester_name, approved, remark, test_number)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        instructionId,
        testRunId,
        testerName,
        approved ? 1 : 0,
        remark,
        testNumber,
      ]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error submitting response:", error);
    res.status(500).json({ error: "Failed to submit response" });
  }
});

// Update instruction (protected)
router.put("/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  try {
    await db.runAsync(
      "UPDATE instructions SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [title, content, id]
    );

    const updatedInstruction = await db.getAsync(
      "SELECT * FROM instructions WHERE id = ?",
      [id]
    );

    if (!updatedInstruction) {
      return res.status(404).json({ error: "Instruction not found" });
    }

    res.json(updatedInstruction);
  } catch (error) {
    console.error("Update instruction error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete instruction (protected)
router.delete("/:id", auth, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.runAsync("DELETE FROM instructions WHERE id = ?", [
      id,
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Instruction not found" });
    }

    // Reorder remaining instructions
    const remainingInstructions = await db.allAsync(
      "SELECT id FROM instructions ORDER BY order_index ASC"
    );

    for (let i = 0; i < remainingInstructions.length; i++) {
      await db.runAsync(
        "UPDATE instructions SET order_index = ? WHERE id = ?",
        [i + 1, remainingInstructions[i].id]
      );
    }

    res.json({ message: "Instruction deleted successfully" });
  } catch (error) {
    console.error("Delete instruction error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update instruction order (protected)
router.post("/reorder", auth, async (req, res) => {
  const { instructions } = req.body;

  try {
    for (let i = 0; i < instructions.length; i++) {
      await db.runAsync(
        "UPDATE instructions SET order_index = ? WHERE id = ?",
        [i + 1, instructions[i].id]
      );
    }

    const updatedInstructions = await db.allAsync(
      "SELECT * FROM instructions ORDER BY order_index ASC"
    );

    res.json(updatedInstructions);
  } catch (error) {
    console.error("Reorder instructions error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
