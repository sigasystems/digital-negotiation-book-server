import express from "express";
import { authenticateJWT } from "../middlewares/authenticateJWT.js";
import { offerController } from "../controllers/index.js";

const router = express.Router();

const {
  createOffer,
  updateOffer,
  closeOffer,
  deleteOffer,
  openOffer,
  getAllOffers,
  getOfferById,
  searchOffers, 
  respondOffer, 
  sendOffer, 
  getRecentNegotiations,
  getLatestNegotiation
} = offerController;

router.use(authenticateJWT);

router.post("/create-offer/:id", createOffer);
router.get("/get-all", getAllOffers);
router.get("/get/:id", getOfferById);
router.patch("/update/:id", updateOffer);
router.patch("/close/:id", closeOffer);
router.patch("/open/:id", openOffer);
router.delete("/delete/:id", deleteOffer);
router.get("/search", searchOffers);
router.get("/last-negotiation", getLatestNegotiation);
router.get("/all-negotiations", getRecentNegotiations);
router.post("/respond/:id", respondOffer);
router.post("/send/:id", sendOffer);

export default router
