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
    const parsed = loginSchemaValidation.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(res, 400, parsed.error.issues.map(i => i.message).join(", "));
    }

    const { accessToken, refreshToken, roleDetails, tokenPayload } = await authService.login({ ...parsed.data });

    return successResponse(res, 200, "Login successful", {
      accessToken,
      refreshToken,
      tokenPayload,
      roleCreatedAt: roleDetails?.createdAt,
      roleUpdatedAt: roleDetails?.updatedAt,
      roleIsActive: roleDetails?.isActive ?? false,
    });
  });

export const refreshTokenRotation = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== "string") {
      return errorResponse(res, 400, "Refresh token is required");
    }

    const result = await authService.refreshToken(refreshToken);

    return successResponse(res, 200, "Token refreshed successfully", {
      accessToken: result.accessToken,
      refreshToken: result.newRefreshToken,
      user: result.payload,
    });

  } catch (err) {
    return errorResponse(res, 403, "Invalid or expired refresh token", err.message);
  }
};

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
