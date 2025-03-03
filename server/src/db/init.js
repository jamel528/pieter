import sqlite3 from "sqlite3";
import bcrypt from "bcryptjs";
import { promisify } from "util";

const db = new sqlite3.Database("database.sqlite");

// Promisify database methods
db.runAsync = promisify(db.run.bind(db));
db.getAsync = promisify(db.get.bind(db));
db.allAsync = promisify(db.all.bind(db));

const createTables = async (db) => {
  // Create users table
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create instructions table
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS instructions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      device TEXT CHECK(device IN ('mobile', 'desktop')) NOT NULL,
      video_url TEXT,
      order_index INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create test_responses table with tester_name instead of site_name
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS test_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instruction_id INTEGER NOT NULL,
      test_run_id TEXT NOT NULL,
      tester_name TEXT NOT NULL,
      approved INTEGER NOT NULL,
      remark TEXT,
      test_number INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instruction_id) REFERENCES instructions(id)
    )
  `);

  // Create questionnaire table
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS questionnaires (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      order_index INTEGER,
      required BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create questionnaire_responses table with tester_name
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS questionnaire_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_run_id TEXT NOT NULL,
      questionnaire_id INTEGER NOT NULL,
      tester_name TEXT NOT NULL,
      answer TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id)
    )
  `);
};

export async function initializeDatabase() {
  try {
    await createTables(db);

    // Check if default admin user exists
    const adminUser = await db.getAsync(
      "SELECT * FROM users WHERE username = ?",
      ["admin"]
    );

    if (!adminUser) {
      // Create default admin user with email
      const hashedPassword = bcrypt.hashSync("admin", 10);
      await db.runAsync(
        "INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
        ["admin", hashedPassword, "admin@example.com"]
      );
    }

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

export default db;
