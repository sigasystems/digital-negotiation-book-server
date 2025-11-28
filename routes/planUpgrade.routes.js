import express from "express";
import {
  getPaymentHistory,
  getCurrentSubscription,
  upgradePlan,
  cancelSubscription,
  reactivateSubscription,
} from "../controllers/planUpgrade.controller.js";
import { authenticateJWT } from "../middlewares/authenticateJWT.js";

const router = express.Router();

// Get payment history for a user
router.get("/payment-history/:userId", authenticateJWT, getPaymentHistory);

// Get current active subscription
router.get("/current/:userId", authenticateJWT, getCurrentSubscription);

// Upgrade/downgrade plan
router.post("/upgrade", authenticateJWT, upgradePlan);

// Cancel subscription
router.post("/cancel", authenticateJWT, cancelSubscription);

// Reactivate subscription
router.post("/reactivate", authenticateJWT, reactivateSubscription);

export default router;
