/**
 * database.js
 * 
 * Database connection and schema initialization for Lab 4.
 * Uses SQLite3 with parameterized queries to prevent SQL injection.
 * 
 * College: Aurora College
 * Subject: Backend Development Fundamentals
 * Student: Anil Kumar Regula
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Absolute path to the SQLite database file
const dbPath = path.join(__dirname, 'userData.db');

// Initialize SQLite database instance
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite database:', err.message);
  } else {
    console.log('✅ Connected to the SQLite database: userData.db');
  }
});

// Create 'users' table if it does not already exist
db.serialize(() => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL
    );
  `;

  db.run(createTableQuery, (err) => {
    if (err) {
      console.error('❌ Error creating users table:', err.message);
    } else {
      console.log('✅ Database initialized: "users" table is ready.');
    }
  });
});

/**
 * Helper function to run a SELECT query returning a single row as a Promise.
 * @param {string} sql - SQL query with ? placeholders
 * @param {Array} params - Array of parameter values
 * @returns {Promise<Object|undefined>}
 */
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

/**
 * Helper function to run an INSERT / UPDATE / DELETE query as a Promise.
 * @param {string} sql - SQL query with ? placeholders
 * @param {Array} params - Array of parameter values
 * @returns {Promise<Object>} Object containing lastID and changes
 */
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

module.exports = {
  db,
  dbGet,
  dbRun
};

