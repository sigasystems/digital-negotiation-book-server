
import { errorResponse, successResponse } from "../handlers/responseHandler.js";
import { asyncHandler } from "../handlers/asyncHandler.js";
import { paymentService } from "../services/payment.service.js";
import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";
import stripe from "../config/stripe.js";
import Plan from "../models/plan.model.js";

export const createPayment = asyncHandler(async (req, res) => {
  try {
    const result = await paymentService.createPayment(req.body);
    successResponse(res, 201, req.body.isStripe ? "Stripe Checkout initiated" : "Manual Payment created successfully", result);
  } catch (err) {
    errorResponse(res, err.status || 500, err.message, err.errors || err);
  }
});

export const getAllPayments = async (req, res) => {
  try {

    // Fetch payments + related user + plan
    const { count, rows: payments } = await Payment.findAndCountAll({
      include: [
        {
          model: User,
          attributes: ["id", "first_name", "last_name", "email"],
        },
        {
          model: Plan,
          attributes: [
            "id",
            // "key",
            "name",
            // "description",
            "priceMonthly",
            "currency",
            "billingCycle",
            // "maxLocations",
            // "maxProducts",
            // "maxOffers",
            // "maxBuyers",
            // "features",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });


    res.status(200).json({
      statusCode: 200,
      success: true,
      message: "Payments fetched successfully",
      data: {
        payments, // ✅ now included
      
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: "Error fetching payments",
      error: error.message
    });
  }
};

export const getPaymentById = asyncHandler(async (req, res) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    successResponse(res, 200, "Payment fetched successfully", payment);
  } catch (err) {
    errorResponse(res, err.status || 500, err.message);
  }
});

export const updatePaymentStatus = asyncHandler(async (req, res) => {
  try {
    const payment = await paymentService.updatePaymentstatuscode(req.params.id, req.body.status);
    successResponse(res, 200, "Payment status updated successfully", payment);
  } catch (err) {
    errorResponse(res, err.status || 500, err.message);
  }
});

export const deletePayment = asyncHandler(async (req, res) => {
  try {
    const result = await paymentService.deletePayment(req.params.id);
    successResponse(res, 200, "Payment deleted successfully", result);
  } catch (err) {
    errorResponse(res, err.status || 500, err.message);
  }
});

export const searchStripePayments = asyncHandler(async (req, res) => {
  try {
    const payments = await paymentService.searchStripePayments(req.query);
    successResponse(res, 200, "Stripe payments fetched successfully", payments);
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
});



// Fetch Stripe session info and related subscription/payment
export const getSessionInfo = async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) return res.status(400).json({ success: false, message: "Session ID is required" });

  try {
    // Fetch Stripe checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"]
    });

    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    const payment = await Payment.findOne({ where: { transactionId: session.id } });
    if (!payment) return res.status(404).json({ success: false, message: "Payment record not found" });

    const user = await User.findByPk(payment.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Prepare features depending on plan (you can expand this logic)
    let features = [];
    switch (payment.planName) {
      case "Advanced":
        features = ["Users: 25", "Products: 100", "Offers: 50", "Buyers: 250"];
        break;
      case "Standard":
        features = ["Users: 10", "Products: 50", "Offers: 25", "Buyers: 100"];
        break;
      default:
        features = ["Default features"];
    }

    res.json({
      success: true,
      payment_status: payment.status === "success" ? "paid" : "pending",
      start_date: session.subscription?.current_period_start || Math.floor(Date.now() / 1000),
      end_date: session.subscription?.current_period_end || Math.floor(Date.now() / 1000) + 30*24*60*60,
      plan_name: payment.planName,
      features,
      businessData: {
        businessName: user.businessName,
        email: user.email,
        userRole: user.userRole
      }
    });

  } catch (err) {
    console.error("Stripe session fetch error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ---------------- GET ALL STRIPE PAYMENTS ----------------
export const getAllStripePayments = asyncHandler(async (req, res) => {
  try {
    const payments = await paymentService.searchStripePayments({}); // pass empty object to get all
    const total = payments.length;
    successResponse(res, 200, "All Stripe payments fetched successfully", {total ,payments } );
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
});
