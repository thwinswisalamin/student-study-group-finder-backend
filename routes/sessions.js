// routes/sessions.js - Study Session Scheduling
//
// POST /api/sessions              - Create a session (leader only)
// GET  /api/sessions/upcoming     - Upcoming sessions for current user
// GET  /api/sessions/group/:id    - All sessions for a specific group

import express from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/sessions
// Creates a new study session for a group.
// Only the group leader is allowed to schedule sessions.

router.post('/', verifyToken, async (req, res) => {
  const { group_id, title, date, time, location, description } = req.body;
  const userId = req.user.id;

  // Validate that the essential fields are present
  if (!group_id || !date || !time) {
    return res
      .status(400)
      .json({ message: 'Group ID, date, and time are required.' });
  }

  try {
    // Confirm the group exists and that the requester is its leader
    const [groups] = await pool.query(
      'SELECT leader_id FROM study_groups WHERE id = ?',
      [group_id],
    );

    if (groups.length === 0) {
      return res.status(404).json({ message: 'Group not found.' });
    }

    if (groups[0].leader_id !== userId) {
      return res
        .status(403)
        .json({ message: 'Only the group leader can schedule sessions.' });
    }

    await pool.query(
      `INSERT INTO study_sessions
        (group_id, title, date, time, location, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        group_id,
        title || 'Study Session',
        date,
        time,
        location || null,
        description || null,
        userId,
      ],
    );

    res.status(201).json({ message: 'Study session scheduled successfully!' });
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ message: 'Error creating study session.' });
  }
});

// GET /api/sessions/upcoming
// Returns upcoming sessions (today or future) for all groups
// that the logged-in user is a member of. Limited to 10 results.

router.get('/upcoming', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [sessions] = await pool.query(
      `
      SELECT ss.*, sg.name AS group_name
      FROM study_sessions  ss
      JOIN  study_groups   sg  ON ss.group_id  = sg.id
      JOIN  group_members  gm  ON sg.id        = gm.group_id
      WHERE gm.user_id = ?
        AND ss.date   >= CURDATE()
      ORDER BY ss.date ASC, ss.time ASC
      LIMIT 10
    `,
      [userId],
    );

    res.json(sessions);
  } catch (err) {
    console.error('Upcoming sessions error:', err);
    res.status(500).json({ message: 'Error fetching upcoming sessions.' });
  }
});

// GET /api/sessions/group/:groupId
// Returns all study sessions belonging to a specific group,
// sorted by date and time ascending.

router.get('/group/:groupId', verifyToken, async (req, res) => {
  const { groupId } = req.params;

  try {
    const [sessions] = await pool.query(
      `SELECT * FROM study_sessions
       WHERE group_id = ?
       ORDER BY date ASC, time ASC`,
      [groupId],
    );

    res.json(sessions);
  } catch (err) {
    console.error('Group sessions error:', err);
    res.status(500).json({ message: 'Error fetching group sessions.' });
  }
});

export default router;
