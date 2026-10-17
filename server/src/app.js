import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import pool from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";

const app = express();

// Security headers
app.use(helmet());

// Allow requests from the frontend
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// Parse request bodies and cookies
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      status: "ok",
      message: "CyberGuard Academy API is running",
      database: "connected",
    });
  } catch (error) {
    console.error("Health check error:", error.message);

    return res.status(503).json({
      status: "error",
      message: "Service temporarily unavailable",
    });
  }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/quizzes", quizRoutes);

export default app;