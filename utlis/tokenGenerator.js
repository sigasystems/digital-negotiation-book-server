import jwt from "jsonwebtoken";

export const refreshTokenGenerator = (res, payload) => {
  // Clear previous cookie
  res.clearCookie("refreshToken", { path: "/" });

  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  const safeUserInfo = {
    id: payload.id,
    email: payload.email,
    userRole: payload.userRole,
    name: payload.name,
    businessName: payload.businessName,
  };

  res.cookie("userInfo", JSON.stringify(safeUserInfo), {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 5 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  return refreshToken;
};

export const accessTokenGenerator = (payload) => {
  const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "30min",
  });
  return accessToken
}
