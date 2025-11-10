import express from "express";
import { authenticateJWT } from "../middlewares/authenticateJWT.js";
import {offeDraftController} from "../controllers/index.js"
import { checkPlanLimit } from "../middlewares/checkPlanLimit.js";

const {
  createOfferDraft,
  getAllOfferDrafts,
  getOfferDraftById,
  updateOfferDraft,
  deleteOfferDraft,
  updateOfferStatus,
  searchOfferDrafts
} = offeDraftController;

const router = express.Router();

router.use(authenticateJWT);
router.post("/create-draft", checkPlanLimit("offer"), createOfferDraft);
router.get("/get-all", getAllOfferDrafts);
router.get("/get/:id", getOfferDraftById);
router.patch("/update/:id", updateOfferDraft);
router.delete("/delete/:id", deleteOfferDraft);
router.patch("/:id/status", updateOfferStatus);
router.get("/search", searchOfferDrafts);

export default router;