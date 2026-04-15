// routes/posts.js - Group Communication (Announcements & Posts)
//
// POST /api/posts              - Post a message to a group
// GET  /api/posts/group/:id   - Get all posts for a group

import express from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/posts
// Creates a new post in a group's communication board.
// Only group members are allowed to post.

router.post('/', verifyToken, async (req, res) => {
  const { group_id, content } = req.body;
  const userId = req.user.id;

  if (!group_id || !content || content.trim() === '') {
    return res
      .status(400)
      .json({ message: 'Group ID and message content are required.' });
  }

  try {
    // Verify the user is a member of the group before allowing them to post
    const [membership] = await pool.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [group_id, userId],
    );

    if (membership.length === 0) {
      return res.status(403).json({
        message: 'You must be a member of this group to post.',
      });
    }

    await pool.query(
      'INSERT INTO posts (group_id, user_id, content) VALUES (?, ?, ?)',
      [group_id, userId, content.trim()],
    );

    res.status(201).json({ message: 'Message posted successfully.' });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ message: 'Error creating post.' });
  }
});

// GET /api/posts/group/:groupId
// Retrieves all posts for a given group, newest first.
// Joins with users table to get the author's name.

router.get('/group/:groupId', verifyToken, async (req, res) => {
  const { groupId } = req.params;

  try {
    const [posts] = await pool.query(
      `
      SELECT p.*, u.name AS author_name
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.group_id = ?
      ORDER BY p.created_at DESC
    `,
      [groupId],
    );

    res.json(posts);
  } catch (err) {
    console.error('Fetch posts error:', err);
    res.status(500).json({ message: 'Error fetching posts.' });
  }
});

export default router;
