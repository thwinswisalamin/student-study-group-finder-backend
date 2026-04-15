import express from "express";
import cors from "cors";

// Import all route modules
import authRoutes from "./routes/auth.js";
import groupRoutes from "./routes/groups.js";
import sessionRoutes from "./routes/sessions.js";
import postRoutes from "./routes/posts.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const PORT = process.env.PORT || 5000;

// GLOBAL MIDDLEWARE

// Parse incoming JSON request bodies
app.use(express.json());

// Allow requests from the React frontend (running on port 5173)
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

// ROUTES

app.use("/api/auth", authRoutes); // Registration & login
app.use("/api/groups", groupRoutes); // Study group CRUD & membership
app.use("/api/sessions", sessionRoutes); // Study session scheduling
app.use("/api/posts", postRoutes); // Group communication posts
app.use("/api/admin", adminRoutes); // Admin dashboard statistics

// START SERVER
app.listen(PORT, () => {
  console.log(`The server is running on http://localhost:${PORT}`);
});
