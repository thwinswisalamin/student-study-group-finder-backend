// routes/admin.js - Admin Dashboard Statistics
// All routes here require: verifyToken + adminOnly middleware

// GET /api/admin/stats - Platform overview statistics
// GET /api/admin/users - Full list of registered users

import express from 'express';
import pool from '../config/db.js';
import { verifyToken, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Apply both middlewares to every route in this file.
// verifyToken checks the JWT, adminOnly checks the role.
router.use(verifyToken, adminOnly);

// GET /api/admin/stats
// Returns aggregated statistics about the platform:
// - Total registered users
// - Total study groups
// - Top 5 most active courses (by number of groups)
// - 5 most recently created groups

router.get('/stats', async (req, res) => {
  try {
    // Count total users registered on the platform
    const [[{ total_users }]] = await pool.query(
      'SELECT COUNT(*) AS total_users FROM users',
    );

    // Count total study groups created
    const [[{ total_groups }]] = await pool.query(
      'SELECT COUNT(*) AS total_groups FROM study_groups',
    );

    // Find the courses with the most study groups
    const [top_courses] = await pool.query(`
      SELECT course_name, COUNT(*) AS group_count
      FROM study_groups
      GROUP BY course_name
      ORDER BY group_count DESC
      LIMIT 5
    `);

    // Fetch the 5 most recently created groups with their leader names
    const [recent_groups] = await pool.query(`
      SELECT sg.id, sg.name, sg.course_name, sg.course_code,
             u.name AS leader_name, sg.created_at
      FROM study_groups sg
      JOIN users u ON sg.leader_id = u.id
      ORDER BY sg.created_at DESC
      LIMIT 5
    `);

    res.json({ total_users, total_groups, top_courses, recent_groups });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ message: 'Error fetching admin statistics.' });
  }
});

// GET /api/admin/users
// Returns a full list of all registered users.

router.get('/users', async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, name, email, program, year_of_study, role, created_at
       FROM users
       ORDER BY created_at DESC`,
    );
    res.json(users);
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ message: 'Error fetching users.' });
  }
});

export default router;
