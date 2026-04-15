// middleware/auth.js - JWT Verification Middleware
// These functions are used as middleware on protected routes

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// verifyToken - Validates the Bearer JWT in the Authorization header
// Attaches the decoded user payload to req.user on success
// Usage: router.get('/protected', verifyToken, (req, res) => { ... })

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // The token must be sent as: "Authorization: Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. Please log in.' });
  }

  // Extract the token part (after "Bearer ")
  const token = authHeader.split(' ')[1];

  try {
    // Verify the token signature and expiry using our secret
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user info to the request object for use in route handlers
    // decoded contains: { id, name, email, role }
    req.user = decoded;

    next(); // Proceed to the actual route handler
  } catch (err) {
    // Token is expired, tampered, or invalid
    return res
      .status(403)
      .json({ message: 'Invalid or expired token. Please log in again.' });
  }
};

// adminOnly - Restricts access to users with the 'admin' role
// Must always be used AFTER verifyToken in the middleware chain
// Usage: router.get('/admin', verifyToken, adminOnly, handler)

export const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
};
