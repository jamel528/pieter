import express from "express";
import db from "../db/init.js";
import { auth } from "../middleware/auth.js";
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";

const router = express.Router();

// Helper function to format duration
function formatDuration(startTime, endTime) {
  const duration = (new Date(endTime) - new Date(startTime)) / (1000 * 60); // in minutes
  if (duration < 60) {
    return `${Math.round(duration)} minutes`;
  }
  return `${Math.round(duration / 60)} hours ${Math.round(
    duration % 60
  )} minutes`;
}

// Helper function to format date
function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Generate PDF report
async function generatePDFReport(testRunId, testerName, startTime, endTime) {
  // Get all test responses for this run
  const responses = await db.allAsync(
    `SELECT tr.*, i.title, i.content, i.device
     FROM test_responses tr
     JOIN instructions i ON tr.instruction_id = i.id
     WHERE tr.test_run_id = ?
     ORDER BY tr.test_number`,
    [testRunId]
  );

  // Get questionnaire responses
  const questionnaireResponses = await db.allAsync(
    `SELECT qr.*, q.title
     FROM questionnaire_responses qr
     JOIN questionnaires q ON qr.questionnaire_id = q.id
     WHERE qr.test_run_id = ?`,
    [testRunId]
  );

  console.log(questionnaireResponses);

  // Create PDF document
  const doc = new PDFDocument();
  let buffers = [];
  doc.on("data", buffers.push.bind(buffers));

  // Format dates for report
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  const duration = formatDuration(startTime, endTime);

  // Introduction
  doc.fontSize(12).text(
    `Today, ${new Date().toLocaleString("en-GB", {
      timeZone: "Europe/Berlin",
    })}, I completed testing.` +
      `I started the test at ${startDate.toLocaleTimeString("en-GB", {
        timeZone: "Europe/Berlin",
      })} and finished at ${endDate.toLocaleTimeString("en-GB", {
        timeZone: "Europe/Berlin",
      })}. ` +
      `Total testing took us ${duration}.`,
    { align: "left" }
  );
  doc.moveDown(2);

  // Speed test results section
  doc.text("The remarks of our test:", { align: "left" });
  doc.moveDown();

  questionnaireResponses.forEach((response) => {
    doc.text(`${response.title}: ${response.answer}`, { continued: false });
    doc.moveDown(0.5);
  });

  doc.moveDown(2);

  // Test results section
  doc.text(
    `We tested the following ${responses.length} things, and here are the results:`,
    { align: "left" }
  );
  doc.moveDown();

  responses.forEach((response) => {
    doc.text(
      `${response.test_number}: ${response.title}  [${
        response.approved ? "Approved" : "Rejected"
      }]`,
      { continued: false }
    );
    if (!response.approved && response.remark) {
      doc.text(`   Remark: ${response.remark}`, { indent: 20 });
    }
    doc.moveDown(0.5);
  });

  // Return promise that resolves with PDF buffer
  return new Promise((resolve) => {
    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });
    doc.end();
  });
}

// Get questionnaire for session
router.get("/questionnaires", async (req, res) => {
  try {
    const questions = await db.allAsync(
      "SELECT * FROM questionnaires ORDER BY order_index"
    );
    res.json(questions);
  } catch (error) {
    console.error("Error fetching questionnaire:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: Create/update questionnaire
router.post("/questionnaire", auth, async (req, res) => {
  const { questions } = req.body;

  try {
    // First, delete all existing questions
    await db.runAsync("DELETE FROM questionnaires");

    // Then insert new questions
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      await db.runAsync(
        "INSERT INTO questionnaires (title, order_index, required) VALUES (?, ?, ?)",
        [question.title, i, question.required !== false]
      );
    }

    res.json({ message: "Questionnaire updated successfully" });
  } catch (error) {
    console.error("Error updating questionnaire:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Submit questionnaire responses
router.post("/questionnaire/submit", async (req, res) => {
  try {
    const { testRunId, responses, testerName } = req.body;

    // Insert questionnaire responses
    for (const response of responses) {
      await db.runAsync(
        `INSERT INTO questionnaire_responses (test_run_id, questionnaire_id, tester_name, answer)
         VALUES (?, ?, ?, ?)`,
        [testRunId, response.questionId, testerName, response.answer]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error submitting questionnaire:", error);
    res.status(500).json({ error: "Failed to submit questionnaire" });
  }
});

// Generate report endpoint
router.post("/report/generate", async (req, res) => {
  try {
    const { testRunId, testerName, startTime, endTime } = req.body;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error(
        "Email configuration is missing. Please check .env file."
      );
    }

    const pdfData = await generatePDFReport(
      testRunId,
      testerName,
      startTime,
      endTime
    );

    // Send email with PDF report
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    if (!process.env.EMAIL_USER) {
      throw new Error("Admin email not configured");
    }

    const mailOptions = {
      from:
        '"Test Instruction Management System" <' + process.env.EMAIL_USER + ">",
      to: "Pieter@dayzsolutions.com",
      subject: `Test Report for ${testerName}`,
      text: `Please find attached the test report for ${testerName}.`,
      attachments: [
        {
          filename: `test-report-${testerName}.pdf`,
          content: pdfData,
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (error) {
    console.error("Error generating report:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to generate report" });
  }
});

export default router;
