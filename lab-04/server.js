/**
 * server.js
 * 
 * Express server for Lab 4: Registration, Login and JWT Authentication
 * 
 * College: Aurora College
 * Subject: Backend Development Fundamentals
 * Faculty: Joel Prashanth D
 * Student: Anil Kumar Regula
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { dbGet, dbRun } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Secret key for signing JWT tokens (kept in a constant for this lab)
const JWT_SECRET = 'AURORA_LAB_04_JWT_SECRET_KEY';

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// Root endpoint for quick health check
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Backend Lab 4: Registration, Login and JWT Authentication API is running.'
  });
});

/**
 * -------------------------------------------------------------
 * 1. REGISTRATION API
 * -------------------------------------------------------------
 * Endpoint: POST /register/ (also handles /register)
 * Request Body:
 * {
 *   "username": "anil",
 *   "name": "Anil Kumar",
 *   "password": "Anil@123"
 * }
 */
const handleRegistration = async (req, res) => {
  try {
    const { username, name, password } = req.body;

    // Step 1: Validate required fields
    if (!username || !name || !password) {
      return res.status(400).json({
        error: 'Missing required fields: username, name, and password are required'
      });
    }

    // Trim strings to avoid whitespace-only credentials
    const cleanUsername = String(username).trim();
    const cleanName = String(name).trim();

    if (!cleanUsername || !cleanName || !password) {
      return res.status(400).json({
        error: 'Fields cannot be empty or blank'
      });
    }

    // Step 2: Check if username already exists in database
    const checkUserQuery = `SELECT * FROM users WHERE username = ?;`;
    const existingUser = await dbGet(checkUserQuery, [cleanUsername]);

    if (existingUser) {
      // Username is already taken
      return res.status(400).json({
        error: 'Username already exists'
      });
    }

    // Step 3: Hash password securely using bcrypt
    // Salt rounds: 10 (standard industry cost factor)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Step 4: Insert new user record using parameterized SQL query
    const insertUserQuery = `
      INSERT INTO users (username, name, password)
      VALUES (?, ?, ?);
    `;
    await dbRun(insertUserQuery, [cleanUsername, cleanName, hashedPassword]);

    // Step 5: Return success response
    return res.status(200).json({
      message: 'User registered successfully'
    });

  } catch (error) {
    console.error('Registration Error:', error.message);
    return res.status(500).json({
      error: 'Internal server error during registration'
    });
  }
};

app.post('/register', handleRegistration);
app.post('/register/', handleRegistration);


/**
 * -------------------------------------------------------------
 * 2. LOGIN API
 * -------------------------------------------------------------
 * Endpoint: POST /login/ (also handles /login)
 * Request Body:
 * {
 *   "username": "anil",
 *   "password": "Anil@123"
 * }
 */
const handleLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Step 1: Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        error: 'Missing required fields: username and password are required'
      });
    }

    const cleanUsername = String(username).trim();

    // Step 2: Retrieve user from database by username
    const selectUserQuery = `SELECT * FROM users WHERE username = ?;`;
    const dbUser = await dbGet(selectUserQuery, [cleanUsername]);

    // Step 3: Check if user exists
    if (!dbUser) {
      return res.status(400).json({
        error: 'Invalid user'
      });
    }

    // Step 4: Compare entered password with stored hashed password
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (!isPasswordMatched) {
      return res.status(400).json({
        error: 'Invalid password'
      });
    }

    // Step 5: Generate JWT Token
    // Payload contains ONLY the username (never the password or hash)
    const payload = {
      username: dbUser.username
    };

    const jwtToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '1h' // Token expires after 1 hour
    });

    // Step 6: Return the generated JWT token in JSON format
    return res.status(200).json({
      jwt_token: jwtToken
    });

  } catch (error) {
    console.error('Login Error:', error.message);
    return res.status(500).json({
      error: 'Internal server error during login'
    });
  }
};

app.post('/login', handleLogin);
app.post('/login/', handleLogin);


// Start server only when run directly (enables programmatic testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server is listening at http://localhost:${PORT}`);
  });
}

module.exports = app;

