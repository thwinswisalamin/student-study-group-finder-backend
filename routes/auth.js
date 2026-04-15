// routes/auth.js - User Registration and Login
// POST /api/auth/register
// POST /api/auth/login
// GET  /api/auth/me  (get current user info)

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// POST /api/auth/register
// Creates a new student account

router.post('/register', async (req, res) => {
  const { name, email, password, program, year_of_study } = req.body;

  // All three fields are required
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: 'Name, email, and password are required.' });
  }

  // Basic email format check
  if (!email.includes('@')) {
    return res
      .status(400)
      .json({ message: 'Please provide a valid email address.' });
  }

  try {
    // Check if this email is already registered
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email],
    );
    if (existing.length > 0) {
      return res
        .status(409)
        .json({ message: 'This email is already registered.' });
    }

    // Hash the password using bcrypt (10 salt rounds is a good balance)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    await pool.query(
      'INSERT INTO users (name, email, password, program, year_of_study) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, program || null, year_of_study || null],
    );

    res
      .status(201)
      .json({ message: 'Registration successful! You can now log in.' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// POST /api/auth/login
// Authenticates the user and returns a JWT token

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: 'Email and password are required.' });
  }

  try {
    // Look for the user by email
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [
      email,
    ]);

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = users[0];

    // Compare the provided password against the stored bcrypt hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Generate a JWT token valid for 7 days
    // The payload contains essential user info for client-side use
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    // Send back the token and safe user info (no password)
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        program: user.program,
        year_of_study: user.year_of_study,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// GET /api/auth/me
// Returns the current logged-in user's profile (requires token)

router.get('/me', verifyToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, program, year_of_study, role, created_at FROM users WHERE id = ?',
      [req.user.id],
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json(users[0]);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

export default router;
