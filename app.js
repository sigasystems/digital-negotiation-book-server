import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import {
  locationRoutes,
  authRoutes,
  superadminRoutes,
  businessOwnerRoutes,
  productRoutes,
  offerDraftRoute,
  offerRoute,
  planRoutes,
  paymentRoutes,
  subscriptionRoutes,
} from "./routes/index.js";

import { notFoundHandler, errorHandler } from "./handlers/index.js";
import { stripeWebhook } from "./controllers/stripeWebhook.controller.js";

dotenv.config();

const app = express();

// -----------------------------
// ✅ Dynamic CORS Configuration
// -----------------------------
const allowedOrigins = [
  // "https://dnb.sigasystems.com",
  // "http://localhost:3000",
  // "http://localhost:5173",
  // "https://digital-negotiation-book-server.vercel.app",
  "*",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked for origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};

// ✅ Apply CORS before all routes
app.use(cors(corsOptions));

// ✅ Explicitly handle preflight OPTIONS requests
// app.options("*", cors(corsOptions));
app.options("/*", cors(corsOptions));


// -----------------------------
// ✅ Webhook route (before body parser)
// -----------------------------
app.post(
  "/api/subscription/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// -----------------------------
// ✅ Middleware stack
// -----------------------------
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// -----------------------------
// ✅ API Routes
// -----------------------------
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/business-owner", businessOwnerRoutes);
app.use("/api/offer-draft", offerDraftRoute);
app.use("/api/product", productRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/offer", offerRoute);

// -----------------------------
// ✅ Error handlers
// -----------------------------
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
