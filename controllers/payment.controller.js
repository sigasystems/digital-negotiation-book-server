
import { errorResponse, successResponse } from "../handlers/responseHandler.js";
import { asyncHandler } from "../handlers/asyncHandler.js";
import { paymentService } from "../services/payment.service.js";

export const createPayment = asyncHandler(async (req, res) => {
  try {
    const result = await paymentService.createPayment(req.body);
    successResponse(res, 201, req.body.isStripe ? "Stripe Checkout initiated" : "Manual Payment created successfully", result);
  } catch (err) {
    errorResponse(res, err.status || 500, err.message, err.errors || err);
  }
});

export const getPayments = asyncHandler(async (req, res) => {
  try {
    const payments = await paymentService.getAllPayments();
    successResponse(res, 200, "Payments fetched successfully", { total: payments.length, payments });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
});

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
    const payment = await paymentService.updatePaymentStatus(req.params.id, req.body.status);
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

// ---------------- GET ALL STRIPE PAYMENTS ----------------
export const getAllStripePayments = asyncHandler(async (req, res) => {
  try {
    const payments = await paymentService.searchStripePayments({}); // pass empty object to get all
    successResponse(res, 200, "All Stripe payments fetched successfully", payments);
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
});
