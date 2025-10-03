import express from "express";
import { authenticateJWT } from "../middlewares/authenticateJWT.js";
import {businessOwnerController} from "../controllers/index.js"

const router = express.Router();

// ================== Buyer Routes ==================
const { addBuyer, deleteBuyer, activateBuyer, deactivateBuyer, editBuyer, becomeBusinessOwner, searchBuyers, getAllBuyers, getBuyerById } = businessOwnerController;

router.post("/add-buyer", authenticateJWT, addBuyer);
router.delete("/delete-buyer/:id", authenticateJWT, deleteBuyer);
router.patch("/activate-buyer/:id/activate", authenticateJWT, activateBuyer);
router.patch("/deactivate-buyer/:id/deactivate", authenticateJWT, deactivateBuyer);
router.patch("/edit-buyer/:id/edit", authenticateJWT, editBuyer);

// ================== Business Owner Routes ==================
router.post("/become-business-owner", becomeBusinessOwner);
router.get("/:ownerId/buyers/search", authenticateJWT, searchBuyers);
router.get("/get-all-buyers", authenticateJWT, getAllBuyers);
router.get("/get-buyer/:id", authenticateJWT, getBuyerById);

export default router;
