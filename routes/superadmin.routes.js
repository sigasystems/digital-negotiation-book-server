import express from "express";

import { authenticateJWT } from "../middlewares/authenticateJWT.js";
import { superadminController } from "../controllers/index.js";

const router = express.Router();

// CRUD
router.post("/create-business-owner",authenticateJWT, superadminController.createBusinessOwner);  // Create
router.get("/business-owners",authenticateJWT, superadminController.getAllBusinessOwners);       // Get all
router.get("/business-owner/:id",authenticateJWT, superadminController.getBusinessOwnerById);    // Get by ID
router.patch("/business-owner/:id",authenticateJWT, superadminController.updateBusinessOwner);     // Update

//deactivate & activate
router.patch("/business-owner/:id/deactivate",authenticateJWT, superadminController.deactivateBusinessOwner); // sets isDeleted = true, status = inactive
router.patch("/business-owner/:id/activate",authenticateJWT, superadminController.activateBusinessOwner);     // sets isDeleted = false, status = active

//soft delete
router.delete("/business-owner/:id",authenticateJWT, superadminController.softDeleteBusinessOwner);

// Approve / Reject
// router.post("/business-owner/:id/approve",authenticateJWT, superadminController.approveBusinessOwner);
// router.post("/business-owner/:id/reject",authenticateJWT, superadminController.rejectBusinessOwner);

//review with approve and reject ok
router.patch("/business-owner/:id/review",authenticateJWT, superadminController.reviewBusinessOwner);

export default router;
