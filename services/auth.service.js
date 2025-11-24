import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userRepository from "../repositories/user.repository.js";
import passwordResetRepository from "../repositories/passwordReset.repository.js";
import { accessTokenGenerator, refreshTokenGenerator } from "../utlis/tokenGenerator.js";
import { generateEmailTemplate, sendEmailWithRetry } from "../utlis/emailTemplate.js";
import { emailLoginButton } from "../utlis/emailTemplate.js";
import transporter from "../config/nodemailer.js";
import { checkAccountStatus } from "../utlis/helper.js";
import buyersRepository from "../repositories/buyers.repository.js";
import offerRepository from "../repositories/offer.repository.js";

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function register(userData) {
  const { first_name, last_name, company_name, email, country_code, phone_number, password } = userData;

  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) throw new Error("User already exists. Kindly login.");

  const existingPhone = await userRepository.findByPhone(country_code, phone_number);
  if (existingPhone) throw new Error("Phone number already registered.");

  const password_hash= await bcrypt.hash(password, 12);
  return await userRepository.createUser({
    first_name,
    last_name,
    company_name,
    email,
    country_code,
    phone_number,
    password: password_hash,
  });
}

export async function login({ res, email, password, businessName }) {
  let user = await userRepository.findByEmail(email);

  // If user doesn't exist, create them
  if (!user) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserData = {
      email,
      password: hashedPassword,
      roleId: 6, // default role for new users
    };

    if (businessName && businessName.trim() !== "") {
      newUserData.businessName = businessName.trim();
    }

    user = await userRepository.createUser(newUserData);
  } else {
    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid email or password");
  }

  // Get associated business owner info (tenant-level relationship)
  const businessOwner = await userRepository.findBusinessOwnerByUserId(user.id);

  // ✅ Enforce business name rules
  if (user.roleId !== 1 && user.roleId !== 6) {
    // Require business name if user exists and role is not admin/user
    if (!businessName || businessName.trim() === "") {
      throw new Error("Business name is required to log in");
    }

    const inputBusiness = businessName.trim().toLowerCase();
    const storedBusiness =
      (businessOwner?.businessName || user?.businessName || "").trim().toLowerCase();

    if (storedBusiness && inputBusiness !== storedBusiness) {
      throw new Error("Wrong business name");
    }
  }

  // Validate user & business owner account status
  checkAccountStatus(user, "User");

  const roleDetails = await userRepository.findRoleById(user.roleId);
  const roleName = roleDetails?.name || "guest";
  let tokenPayload;

  switch (user.roleId) {
    case 2:
      checkAccountStatus(businessOwner, "Business Owner");
      tokenPayload = {
        id: user.id,
        businessOwnerId: businessOwner.id,
        email: user.email,
        userRole: roleName,
        paymentId: businessOwner.paymentId,
        businessName: businessOwner.businessName,
        name: `${user?.first_name || ""} ${user?.last_name || ""}`.trim(),
      };
      break;

    case 3:
      const buyer = await userRepository.findBuyerByEmail(email);
      checkAccountStatus(buyer, "Buyer");
      tokenPayload = {
        id: buyer.id,
        email: user.email,
        userRole: roleName,
        businessName: buyer.buyersCompanyName,
        name: buyer.contactName,
        ownerId: buyer.ownerId,
      };
      try {
          const activeNegotiation = await offerRepository.findLatestActiveNegotiationForBuyer({
          buyerId: buyer.id,
          businessOwnerId: buyer.ownerId,
        });
        tokenPayload.activeNegotiationId = activeNegotiation?.id ?? null;
      } catch (e) {
        tokenPayload.activeNegotiationId = null;
        console.warn("Failed to load active negotiation for buyer:", e);
      }
      break;

    default:
      if (!roleDetails?.isActive) {
        throw new Error(`The role '${roleDetails?.name}' is inactive. Contact support.`);
      }
      tokenPayload = {
        id: user.id,
        email: user.email,
        userRole: roleName,
        businessName: user.businessName || "",
        name: `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || " ",
      };
      break;
  }

  const accessToken = accessTokenGenerator(tokenPayload);
  const refreshToken = refreshTokenGenerator(tokenPayload);
  return { accessToken, roleDetails, tokenPayload, refreshToken };
}

export async function refreshToken(oldToken) {
  try {
    const decoded = jwt.verify(oldToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await userRepository.findById(decoded.id);
    if (!user) throw new Error("User not found");

    const roleMap = {
      1: "super_admin",
      2: "business_owner",
      3: "buyer",
      4: "manager",
      5: "support_staff",
      6: "guest",
    };

    let businessOwner = null;
    let businessOwnerId = null;
    let businessName = null;

    if (user.roleId === 2) {
      businessOwner = await buyersRepository.findOwnerByEmail(user.email);
      if (businessOwner) {
        businessOwnerId = businessOwner.id;
        businessName = businessOwner.businessName;
      }
    }

    const payload = {
      id: user.id,
      email: user.email,
      userRole: user.userRole || roleMap[user.roleId] || null,
      name: user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || null,
      businessName,
      ...(businessOwnerId ? { businessOwnerId } : {}),
    };

    const newAccessToken = accessTokenGenerator(payload);
    const newRefreshToken = refreshTokenGenerator(payload);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      payload,
    };

  } catch (err) {
    console.error("Refresh token failed:", err);
    throw new Error("Invalid refresh token");
  }
}

async function requestPasswordReset(email) {
  const user = await userRepository.findByEmail(email);
  if (!user) return; // silent fail

  const otp = generateOtp();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await passwordResetRepository.createOtp({ email, otp: hashedOtp, expiresAt });

  const emailHtml = generateEmailTemplate({
    title: "Password Reset OTP",
    subTitle: `Hello ${user.fullName || "User"},`,
    body: `<p>Your OTP is:</p><h2>${otp}</h2><p>Expires in 10 min.</p>`,
    footer: "If you didn’t request this, ignore it.",
  });

  await sendEmailWithRetry(transporter, {
    from: `"Support" <noreply@yourapp.com>`,
    to: email,
    subject: "🔑 Password Reset OTP",
    html: emailHtml,
  });
}

async function resetPasswordWithOtp({ email, otp, password }) {
  const record = await passwordResetRepository.findLatestOtpByEmail(email);
  if (!record) throw new Error("Invalid or expired OTP");
  if (new Date(record.expiresAt) < new Date()) throw new Error("OTP expired");

  const isMatch = await bcrypt.compare(otp, record.otp);
  if (!isMatch) throw new Error("Invalid OTP");

  const user = await userRepository.findByEmail(email);
  if (!user) throw new Error("User not found");

  user.password = await bcrypt.hash(password, 10);
  await user.save();
  await passwordResetRepository.markUsed(record);

  const emailHtml = generateEmailTemplate({
    title: "Password Reset Successful",
    subTitle: `Hello ${user.fullName || "User"},`,
    body: `<p>Password reset successfully.</p>${emailLoginButton({
      url: "http://localhost:5000/api/auth/login",
      label: "Login Now",
    })}`,
    footer: "This is an automated email.",
  });

  await sendEmailWithRetry(transporter, {
    from: `"Support" <noreply@yourapp.com>`,
    to: email,
    subject: "✅ Password Reset Successful",
    html: emailHtml,
  });
}

// Export all functions as a service
const AuthService = {
  register,
  login,
  refreshToken,
  requestPasswordReset,
  resetPasswordWithOtp,
};

export default AuthService;
