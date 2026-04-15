// config/db.js this is for MySQL Database Connection
// Uses mysql2's promise-based API so we can use async/await
// A connection pool is used to reuse connections efficiently

import mysql from 'mysql2/promise';

// Create a pool/list of up to 10 simultaneous database connections.
// The pool automatically handles acquiring and releasing connections.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'study_group_finder',
  waitForConnections: true, // keeps requests waiting instead of failing immediately
  connectionLimit: 10, // Maximum number of open connections
  queueLimit: 0, // Unlimited queue size
});

// Quick connection test on startup to check if DB is reachable
pool
  .getConnection()
  .then((conn) => {
    console.log('✅ MySQL database connected successfully.');
    conn.release(); // For releasing connections back to the pool
  })
  .catch((err) => {
    console.error('❌ MySQL connection failed:', err.message);
    console.error(
      '   Check your .env DB settings and make sure MySQL is running.',
    );
  });

export default pool;
