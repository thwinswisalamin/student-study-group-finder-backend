// routes/groups.js - Study Group Management

// GET    /api/groups          - List all groups (with search/filter)
// GET    /api/groups/user/my  - Groups the logged-in user belongs to
// GET    /api/groups/:id      - Single group details + members
// POST   /api/groups          - Create a new group
// PUT    /api/groups/:id      - Edit a group (leader only)
// POST   /api/groups/:id/join  - Join a group
// DELETE /api/groups/:id/leave - Leave a group
// DELETE /api/groups/:gId/members/:uId - Remove a member (leader only)

import express from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/groups
// Returns all study groups. Supports ?search= and ?course= query params.
// This route is public - no login required to browse groups.

router.get('/', async (req, res) => {
  const { search, course } = req.query;

  // Start with the base query joining users for leader name
  // and counting members via a LEFT JOIN
  let query = `
    SELECT
      sg.*,
      u.name  AS leader_name,
      COUNT(DISTINCT gm.user_id) AS member_count
    FROM study_groups sg
    JOIN  users u         ON sg.leader_id = u.id
    LEFT JOIN group_members gm ON sg.id = gm.group_id
  `;
  const params = [];
  const conditions = [];

  // Add search filter if provided (searches name, course name, and course code)
  if (search) {
    conditions.push(
      '(sg.name LIKE ? OR sg.course_name LIKE ? OR sg.course_code LIKE ?)',
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  // Add course-specific filter if provided
  if (course) {
    conditions.push('sg.course_name LIKE ?');
    params.push(`%${course}%`);
  }

  // Attach WHERE clause only if there are filters
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // Group by sg.id to collapse the member count aggregation
  query += ' GROUP BY sg.id ORDER BY sg.created_at DESC';

  try {
    const [groups] = await pool.query(query, params);
    res.json(groups);
  } catch (err) {
    console.error('Groups fetch error:', err);
    res.status(500).json({ message: 'Error fetching study groups.' });
  }
});

// GET /api/groups/user/my
// Returns all groups the currently logged-in user belongs to.

router.get('/user/my', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [groups] = await pool.query(
      `
      SELECT
        sg.*,
        u.name  AS leader_name,
        COUNT(DISTINCT gm2.user_id) AS member_count
      FROM group_members gm
      JOIN  study_groups  sg  ON gm.group_id  = sg.id
      JOIN  users         u   ON sg.leader_id = u.id
      LEFT JOIN group_members gm2 ON sg.id = gm2.group_id
      WHERE gm.user_id = ?
      GROUP BY sg.id
      ORDER BY gm.joined_at DESC
    `,
      [userId],
    );

    res.json(groups);
  } catch (err) {
    console.error('My groups fetch error:', err);
    res.status(500).json({ message: 'Error fetching your groups.' });
  }
});

// GET /api/groups/:id
// Returns a single group's details along with its member list.

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch the group and leader info
    const [groups] = await pool.query(
      `
      SELECT sg.*, u.name AS leader_name
      FROM study_groups sg
      JOIN users u ON sg.leader_id = u.id
      WHERE sg.id = ?
    `,
      [id],
    );

    if (groups.length === 0) {
      return res.status(404).json({ message: 'Group not found.' });
    }

    // Fetch all members of this group
    const [members] = await pool.query(
      `
      SELECT u.id, u.name, u.program, u.year_of_study, gm.joined_at
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
      ORDER BY gm.joined_at ASC
    `,
      [id],
    );

    res.json({ group: groups[0], members });
  } catch (err) {
    console.error('Group detail fetch error:', err);
    res.status(500).json({ message: 'Error fetching group details.' });
  }
});

// POST /api/groups
// Creates a new study group. The creator automatically becomes
// the leader and is added as the first member.

router.post('/', verifyToken, async (req, res) => {
  const { name, course_name, course_code, description, meeting_location } =
    req.body;
  const leader_id = req.user.id;

  // Group name and course name are the minimum required fields
  if (!name || !course_name) {
    return res
      .status(400)
      .json({ message: 'Group name and course name are required.' });
  }

  try {
    // Insert the group record
    const [result] = await pool.query(
      `INSERT INTO study_groups
        (name, course_name, course_code, description, meeting_location, leader_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        course_name,
        course_code || null,
        description || null,
        meeting_location || null,
        leader_id,
      ],
    );

    const groupId = result.insertId;

    // Automatically add the creator as a member of their own group
    await pool.query(
      'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
      [groupId, leader_id],
    );

    res.status(201).json({
      message: 'Study group created successfully!',
      groupId,
    });
  } catch (err) {
    console.error('Group creation error:', err);
    res.status(500).json({ message: 'Error creating group.' });
  }
});

// PUT /api/groups/:id
// Updates a group's information. Only the group leader can do this.

router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, course_name, course_code, description, meeting_location } =
    req.body;

  try {
    // Verify the group exists and the current user is the leader
    const [groups] = await pool.query(
      'SELECT leader_id FROM study_groups WHERE id = ?',
      [id],
    );

    if (groups.length === 0) {
      return res.status(404).json({ message: 'Group not found.' });
    }

    if (groups[0].leader_id !== req.user.id) {
      return res
        .status(403)
        .json({ message: 'Only the group leader can edit this group.' });
    }

    await pool.query(
      `UPDATE study_groups
       SET name = ?, course_name = ?, course_code = ?, description = ?, meeting_location = ?
       WHERE id = ?`,
      [name, course_name, course_code, description, meeting_location, id],
    );

    res.json({ message: 'Group updated successfully.' });
  } catch (err) {
    console.error('Group update error:', err);
    res.status(500).json({ message: 'Error updating group.' });
  }
});

// POST /api/groups/:id/join
// Adds the current user to a study group as a member.

router.post('/:id/join', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Check if the user is already a member to avoid duplicates
    const [existing] = await pool.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [id, userId],
    );

    if (existing.length > 0) {
      return res
        .status(409)
        .json({ message: 'You are already a member of this group.' });
    }

    await pool.query(
      'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
      [id, userId],
    );

    res.json({ message: 'You have successfully joined the group!' });
  } catch (err) {
    console.error('Join group error:', err);
    res.status(500).json({ message: 'Error joining group.' });
  }
});

// DELETE /api/groups/:id/leave
// Removes the current user from a study group.

router.delete('/:id/leave', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    await pool.query(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      [id, userId],
    );

    res.json({ message: 'You have left the group.' });
  } catch (err) {
    console.error('Leave group error:', err);
    res.status(500).json({ message: 'Error leaving group.' });
  }
});

// DELETE /api/groups/:groupId/members/:userId
// Removes a specific member from a group. Only the leader can do this.

router.delete('/:groupId/members/:userId', verifyToken, async (req, res) => {
  const { groupId, userId } = req.params;

  try {
    // Only the group leader is allowed to remove members
    const [groups] = await pool.query(
      'SELECT leader_id FROM study_groups WHERE id = ?',
      [groupId],
    );

    if (groups.length === 0) {
      return res.status(404).json({ message: 'Group not found.' });
    }

    if (groups[0].leader_id !== req.user.id) {
      return res
        .status(403)
        .json({ message: 'Only the group leader can remove members.' });
    }

    await pool.query(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId],
    );

    res.json({ message: 'Member removed from the group.' });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ message: 'Error removing member.' });
  }
});

export default router;
