import express from "express";
import { authcontroller } from "../controllers/index.js";
import { rateLimiter } from "../middlewares/rateLimiter.js";
import { authenticateJWT } from "../middlewares/authenticateJWT.js";
import { requestPasswordReset, resetPasswordWithOtp } from "../controllers/auth.controller.js";
import { authenticateRefreshToken } from "../middlewares/authenticateRefreshToken.js";

const router = express.Router()

// router.post('/register', rateLimiter, register)
router.post('/login', authcontroller.login)
router.post('/refresh-token', authenticateRefreshToken, authcontroller.refreshTokenRotation)
// router.post('/reset-password', authenticateJWT, authController.resetPassword)
router.post("/request-reset", requestPasswordReset);
router.post("/reset-password-otp", resetPasswordWithOtp);

export default router