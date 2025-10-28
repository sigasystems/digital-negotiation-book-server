import express from "express";
import { paymentController } from "../controllers/index.js";

const router = express.Router();

router.post("/create-payment", paymentController.createPayment);
router.get("/getallpayments", paymentController.getPayments);
router.get("/:id", paymentController.getPaymentById);
// Route
router.get("/session/:sessionId", paymentController.getSessionInfo);
router.patch("/:id/status", paymentController.updatePaymentStatus);  //testing remaining 
router.delete("/:id", paymentController.deletePayment);
//----stripe
router.get("/stripe/all", paymentController.getAllStripePayments);
router.get("/payments/search", paymentController.searchStripePayments);   //testing remaining   // filter by email/status

export default router;
