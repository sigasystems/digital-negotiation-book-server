import { successResponse, errorResponse } from "../handlers/responseHandler.js";
import { asyncHandler } from "../handlers/asyncHandler.js";
import authService from "../services/auth.service.js";
import {registerSchemaValidation, loginSchemaValidation } from "../validations/index.js"

export const register = asyncHandler(async (req, res) => {
  try {
    const parsed = registerSchemaValidation.safeParse(req.body);
    if (!parsed.success)
      return errorResponse(res, 400, parsed.error.issues.map(i => i.message).join(", "));

    const user = await authService.register(parsed.data);
    return successResponse(res, 201, "User registered", user);
  } catch (err) {
    return errorResponse(res, 500, err.message || "Registration failed");
  }
});

export const login = asyncHandler(async (req, res) => {
  try {
    const parsed = loginSchemaValidation.safeParse(req.body);
    if (!parsed.success)
      return errorResponse(res, 400, parsed.error.issues.map(i => i.message).join(", "));

    const { accessToken, roleDetails, tokenPayload } = await authService.login({ res, ...parsed.data });

    return successResponse(res, 200, "Login successful", {
      accessToken,
      tokenPayload,
      roleCreatedAt: roleDetails?.createdAt,
      roleUpdatedAt: roleDetails?.updatedAt,
      roleIsActive: roleDetails?.isActive ?? false,
    });
  } catch (err) {
    return errorResponse(res, 401, err.message || "Login failed");
  }
});

export const refreshTokenRotation = asyncHandler(async (req, res) => {
  try {
    console.log("req.cookies?.refreshToken",req.cookies?.refreshToken)
    const token = req.cookies?.refreshToken;
    if (!token) return errorResponse(res, 401, "No refresh token");

    const accessToken = await authService.refreshToken(token, res);
    return successResponse(res, 200, "Access token refreshed", { accessToken });
  } catch (err) {
    return errorResponse(res, 401, err.message || "Refresh token failed");
  }
});

export const requestPasswordReset = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return errorResponse(res, 400, "Email is required");

    await authService.requestPasswordReset(email);
    return successResponse(res, 200, "If registered, an OTP has been sent.");
  } catch (err) {
    return errorResponse(res, 500, err.message || "Failed to send password reset OTP");
  }
});

export const resetPasswordWithOtp = asyncHandler(async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) return errorResponse(res, 400, "All fields required");

    await authService.resetPasswordWithOtp({ email, otp, password });
    return successResponse(res, 200, "Password reset successful.");
  } catch (err) {
    return errorResponse(res, 500, err.message || "Failed to reset password");
  }
});
