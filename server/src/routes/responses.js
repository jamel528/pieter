import express from "express";
import db from "../db/init.js";
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { auth } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

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

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, "../temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Generate PDF report
async function generatePDFReport(testRunId, testerName, startTime, endTime) {
  const pdfPath = path.join(tempDir, `${testRunId}_report.pdf`);
  const zipPath = path.join(tempDir, `${testRunId}_report.zip`);

  // Get test responses
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

  // Create PDF document
  const doc = new PDFDocument({
    margins: {
      top: 72,
      bottom: 72,
      left: 72,
      right: 72,
    },
  });

  // Create write stream for PDF
  const pdfStream = fs.createWriteStream(pdfPath);
  doc.pipe(pdfStream);

  // Add title
  doc.fontSize(16);
  doc.text(`Test Report for ${testerName}`, { align: "center" });
  doc.moveDown();

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

  // Set font to support symbols
  doc.font("Helvetica");
  doc.fontSize(12);

  // Add test run info
  doc.fontSize(12);
  doc.text(`Test Run ID: ${testRunId}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  // Speed test results section
  doc.text("The remarks of our test:", { align: "left" });
  doc.moveDown();

  questionnaireResponses.forEach((response) => {
    doc.text(`${response.title}: ${response.answer}`, { continued: false });
    doc.moveDown(0.5);
  });

  doc.moveDown(2);

  // Add test responses
  doc.text("Test Results:", { underline: true });
  doc.moveDown();

  responses.forEach((response) => {
    const currentY = doc.y;
    const leftMargin = doc.page.margins.left;
    const textHeight = doc.currentLineHeight();

    if (response.approved) {
      // Draw checkmark at the start of the line
      doc
        .save()
        .translate(leftMargin, currentY + textHeight / 2 - 6) // Center vertically with text
        .path("M 0 5 L 3 8 L 8 0")
        .lineWidth(1.5)
        .stroke()
        .restore();
    } else {
      // Draw X at the start of the line
      doc
        .save()
        .translate(leftMargin, currentY + textHeight / 2 - 6) // Center vertically with text
        .path("M 0 0 L 8 8 M 0 8 L 8 0")
        .lineWidth(1.5)
        .stroke()
        .restore();
    }

    // Move cursor back to start of line and write text
    doc.y = currentY;
    doc.text(`${response.test_number}: ${response.title}`, {
      continued: false,
      indent: 20, // Make space for the checkmark/X
    });

    if (!response.approved && response.remark) {
      doc.text(`   Remark: ${response.remark}`, { indent: 20 });
    }
    doc.moveDown(0.5);
  });

  // End the document and wait for it to finish writing
  doc.end();
  await new Promise((resolve) => pdfStream.on("finish", resolve));

  // Create zip file
  const archive = archiver("zip", {
    zlib: { level: 9 }, // Maximum compression
  });
  const zipStream = fs.createWriteStream(zipPath);

  archive.pipe(zipStream);
  archive.file(pdfPath, { name: `${testerName}_test_report.pdf` });
  await archive.finalize();

  // Wait for zip to finish
  await new Promise((resolve) => zipStream.on("close", resolve));

  // Read the zip file
  const zipBuffer = fs.readFileSync(zipPath);

  // Clean up temp files
  fs.unlinkSync(pdfPath);
  fs.unlinkSync(zipPath);

  return zipBuffer;
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

// Send test report endpoint
router.get("/report/:testRunId", async (req, res) => {
  const { testRunId } = req.params;

  try {
    // Get test run info
    const testRun = await db.getAsync(
      "SELECT tester_name, created_at FROM test_responses WHERE test_run_id = ? LIMIT 1",
      [testRunId]
    );

    if (!testRun) {
      return res.status(404).json({ error: "Test run not found" });
    }

    const { tester_name: testerName, created_at: startTime } = testRun;
    const endTime = new Date().toISOString();

    // Generate PDF report
    const zipBuffer = await generatePDFReport(
      testRunId,
      testerName,
      startTime,
      endTime
    );

    // Get report email from settings
    const settings = await db.getAsync(
      "SELECT report_email FROM settings LIMIT 1"
    );
    const reportEmail = settings.report_email;

    // Configure email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send email with zip attachment
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: reportEmail,
      subject: `Test Report: ${testerName}`,
      text: `Please find attached the test report for ${testerName}.`,
      attachments: [
        {
          filename: "test_report.zip",
          content: zipBuffer,
        },
      ],
    });

    res.json({ message: "Report sent successfully" });
  } catch (error) {
    console.error("Error generating/sending report:", error);
    res.status(500).json({ error: "Failed to generate/send report" });
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

    const zipBuffer = await generatePDFReport(
      testRunId,
      testerName,
      startTime,
      endTime
    );

    // Get report email from settings
    const settings = await db.getAsync(
      "SELECT report_email FROM settings LIMIT 1"
    );
    const reportEmail = settings.report_email;

    // Configure email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send email with zip attachment
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: reportEmail,
      subject: `Test Report: ${testerName}`,
      text: `Please find attached the test report for ${testerName}.`,
      attachments: [
        {
          filename: "test_report.zip",
          content: zipBuffer,
        },
      ],
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error generating report:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to generate report" });
  }
});

export default router;
