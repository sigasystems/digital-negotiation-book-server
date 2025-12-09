import express from "express";
import { authenticateJWT } from "../middlewares/authenticateJWT.js";
import { businessOwnerController } from "../controllers/index.js";
import { checkBusinessOwnerUnique } from "../controllers/sa.businessowner.controller.js";
import { check } from "zod/mini";
import checkPlanValidity from "../middlewares/checkPlanValidity.js";
import { checkPlanLimit } from "../middlewares/checkPlanLimit.js";

const router = express.Router();

// ================== Buyer Routes ==================
const {
  addBuyer,
  checkRegistrationNumber,
  deleteBuyer,
  activateBuyer,
  deactivateBuyer,
  editBuyer,
  becomeBusinessOwner,
  searchBuyers,
  getAllBuyers,
  getBuyerById,
  getBuyersList,
} = businessOwnerController;

// router.post("/add-buyer", checkPlanLimit("buyer"), authenticateJWT, addBuyer);
router.post(
  "/add-buyer",
  authenticateJWT,
  checkPlanValidity,
  checkPlanLimit("buyer"),
  addBuyer
);
router.delete("/delete-buyer/:id", authenticateJWT, deleteBuyer);
router.patch("/activate-buyer/:id/activate", authenticateJWT, activateBuyer);
router.patch(
  "/deactivate-buyer/:id/deactivate",
  authenticateJWT,
  deactivateBuyer
);
router.patch("/edit-buyer/:id/edit", authenticateJWT, editBuyer);

// ================== Business Owner Routes ==================
router.post("/become-business-owner", becomeBusinessOwner);
router.get("/:ownerId/buyers/search", authenticateJWT, searchBuyers);
router.get("/get-all-buyers", authenticateJWT, getAllBuyers);
router.get("/get-buyers-list", authenticateJWT, getBuyersList);
router.get("/get-buyer/:id", authenticateJWT, getBuyerById);
router.get("/check-registration/:registrationNumber", checkRegistrationNumber);

router.get("/check-unique", checkBusinessOwnerUnique);

export default router;
