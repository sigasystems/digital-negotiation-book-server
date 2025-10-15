import jwt from "jsonwebtoken";
import { errorResponse } from "../handlers/responseHandler.js";

export const authenticateRefreshToken = (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.cookies?.refreshtoken;

    if (!refreshToken) {
      return errorResponse(res, 401, "Unauthorized: No refresh token provided");
    }

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return errorResponse(res, 403, "Invalid or expired refresh token", err.message);
      }

      req.user = decoded;
      req.token = refreshToken; // pass along if needed
      next();
    });
  } catch (err) {
    return errorResponse(res, 500, "Internal Server Error", err.message);
  }
};
