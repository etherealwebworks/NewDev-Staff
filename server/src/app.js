import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import clientsRoutes from "./routes/clientsRoutes.js";
import worksRoutes from "./routes/worksRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import notificationsRoutes from "./routes/notificationsRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";

const app = express();

app.set("trust proxy", 1);

// --------------------------------------------------
// CORS
// --------------------------------------------------

const allowedOrigins = String(env.clientOrigin || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

console.log("Allowed CORS origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // such as server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log(`CORS blocked origin: ${origin}`);

      return callback(
        new Error(`CORS origin not allowed: ${origin}`)
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
  })
);

// --------------------------------------------------
// Security / middleware
// --------------------------------------------------

app.use(helmet());

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  morgan(
    env.nodeEnv === "development"
      ? "dev"
      : "combined"
  )
);

// --------------------------------------------------
// Rate limiting
// --------------------------------------------------

app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests. Please slow down.",
    },
  })
);

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

// --------------------------------------------------
// API routes
// --------------------------------------------------

app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/works", worksRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/settings", settingsRoutes);

// --------------------------------------------------
// Error handling
// --------------------------------------------------

app.use(notFoundHandler);
app.use(errorHandler);

export default app;