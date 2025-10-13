import jwt from "jsonwebtoken";
import { errorResponse } from "../handlers/responseHandler.js";

export const authenticateAccessToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, 401, "Unauthorized: No access token provided");
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return errorResponse(res, 403, "Invalid or expired access token", err.message);
      }

      req.user = decoded;
      next();
    });
  } catch (err) {
    return errorResponse(res, 500, "Internal Server Error", err.message);
  }
};
