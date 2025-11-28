import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import qs from "qs"

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
  countryRoutes,
  planUpgradeRoutes,
} from "./routes/index.js";

import { notFoundHandler, errorHandler } from "./handlers/index.js";
import { createSessionMiddleware } from "./utlis/session.js";

import stripeWebhookController from "./controllers/stripeWebhook.controller.js";

dotenv.config();
const app = express();

// ---------------------------
// CORS
// ---------------------------
const allowedOrigins = [
  "https://dnb.sigasystems.com",
  "https://digital-negotiation-book.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// ---------------------------
// ⚠️ CRITICAL: Stripe Webhook MUST COME BEFORE BODY PARSER
// ---------------------------
app.post(
  "/api/subscription/webhook",
  express.raw({ type: "application/json" }), // Preserve raw body for signature verification
  stripeWebhookController
);

// ---------------------------
// General Middleware (AFTER webhook route)
// ---------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cookieParser());
app.use(createSessionMiddleware());

app.set("query parser", str => qs.parse(str));

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
app.use("/api/country", countryRoutes);
app.use("/api/offer", offerRoute);
app.use("/api/plan-upgrade", planUpgradeRoutes);

// ---------------------------
// Error Handlers
// ---------------------------
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
