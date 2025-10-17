import bcrypt from "bcrypt";
import buyersRepository from "../repositories/buyers.repository.js";
import generateSecurePassword from "../utlis/genarateSecurePassword.js";
import {
  generateEmailTemplate,
  sendEmailWithRetry,
  emailLoginButton
} from "../utlis/emailTemplate.js";
import transporter from "../config/nodemailer.js";
import {
  accessTokenGenerator,
  refreshTokenGenerator,
} from "../utlis/tokenGenerator.js";
import { Op } from "sequelize";
import formatTimestamps from "../utlis/formatTimestamps.js";

export const buyerService = {
  addBuyer: async (ownerId, buyerData, owner) => {
    const { registrationNumber, contactEmail, contactName } = buyerData;

    // Check unique registration number
    if (registrationNumber) {
      const existingReg = await buyersRepository.findRegistrationNumber(
        registrationNumber
      );
      if (existingReg) return { error: "Registration number already in use" };
    }

    // Check unique email
    const existingUser = await buyersRepository.findUserByEmail(contactEmail);
    if (existingUser) return { error: "Contact email already in use" };

    // Generate and hash password
    const password = generateSecurePassword(12);
    const hashedPassword = await bcrypt.hash(password, 12);

    // Split names
    let firstName = contactName || contactEmail;
    let lastName = "";
    if (contactName) {
      const parts = contactName.trim().split(" ");
      firstName = parts.shift();
      lastName = parts.join(" ");
    }

    // Create User
    const user = await buyersRepository.createUser({
      email: contactEmail,
      password_hash: hashedPassword,
      roleId: 3,
      first_name: firstName,
      last_name: lastName || null,
    });

    // Create Buyer
    const newBuyer = await buyersRepository.create({
      ...buyerData,
      ownerId,
      userId: user.id,
      isVerified: true,
    });

    // Send welcome email
    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    const mailOptions = {
      from: `"${owner.businessName}" <${process.env.EMAIL_USER}>`,
      to: newBuyer.contactEmail,
      subject: `Buyer account created for ${owner.businessName}`,
      html: generateEmailTemplate({
        title: `Welcome to ${owner.businessName} 🎉`,
        subTitle: "Your buyer account has been created",
        body: `
          <p>Hello <b>${newBuyer.contactName || newBuyer.contactEmail}</b>,</p>
          <p>You have been added as a buyer to <b>${owner.businessName}</b>.</p>
          <p><b>Email:</b> ${newBuyer.contactEmail}</p>
          <p><b>Password:</b> ${password}</p>
          <p>Please login and change your password immediately.</p>
          <a href="${loginUrl}" style="background:#4CAF50;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Login</a>
        `,
      }),
    };

    await sendEmailWithRetry(transporter, mailOptions, 2);

    return { created: newBuyer };
  },

  deleteBuyer: async (buyer, owner) => {
    await buyersRepository.softDelete(buyer);

    const mailOptions = {
      from: `"${owner.businessName}" <${process.env.EMAIL_USER}>`,
      to: buyer.contactEmail,
      subject: "Your buyer account has been deleted",
      html: generateEmailTemplate({
        title: `Account Deleted from ${owner.businessName}`,
        subTitle: "Your buyer account is no longer active.",
        body: `<p>Hello <b>${
          buyer.contactName || buyer.contactEmail
        }</b>, your buyer account has been deleted.</p>`,
      }),
    };

    await sendEmailWithRetry(transporter, mailOptions, 2);
    return true;
  },

  activateBuyer: async (buyer, owner) => {
    await buyersRepository.activate(buyer);

    const mailOptions = {
      from: `"${owner.businessName}" <${process.env.EMAIL_USER}>`,
      to: buyer.contactEmail,
      subject: "Buyer activated successfully",
      html: generateEmailTemplate({
        title: `Buyer activated for ${owner.businessName} 🎉`,
        subTitle: "Your account is active again!",
        body: `<p>Hello <b>${
          buyer.contactName || buyer.contactEmail
        }</b>, your account is now active.</p>`,
      }),
    };

    await sendEmailWithRetry(transporter, mailOptions, 2);

    return { updated: buyer };
  },

  deactivateBuyer: async (buyer, owner) => {
    await buyersRepository.deactivate(buyer);

    const mailOptions = {
      from: `"${owner.businessName}" <${process.env.EMAIL_USER}>`,
      to: buyer.contactEmail,
      subject: "Buyer account deactivated",
      html: generateEmailTemplate({
        title: `Your account has been deactivated`,
        subTitle: "Your buyer account is now inactive.",
        body: `<p>Hello <b>${
          buyer.contactName || buyer.contactEmail
        }</b>, your account has been deactivated.</p>`,
      }),
    };

    await sendEmailWithRetry(transporter, mailOptions, 2);

    return { updated: buyer };
  },

  editBuyer: async (buyer, updates, owner) => {
    // Registration number uniqueness
    if (updates.registrationNumber) {
      const existing = await buyersRepository.findByRegistrationNumber(
        updates.registrationNumber
      );
      if (existing && existing.id !== buyer.id)
        return { error: "Registration number already in use" };
    }

    // Check contact email uniqueness
    if (updates.contactEmail) {
      const existing = await buyersRepository.findByContactEmail(
        updates.contactEmail
      );
      if (existing && existing.id !== buyer.id)
        return { error: "Contact email already in use" };
    }

    await buyersRepository.update(buyer, updates);

    const mailOptions = {
      from: `"${owner.businessName}" <${process.env.EMAIL_USER}>`,
      to: buyer.contactEmail,
      subject: "Your buyer account has been updated",
      html: generateEmailTemplate({
        title: `Your account at ${owner.businessName} was updated`,
        subTitle: "Your details were updated successfully.",
        body: `<p>Hello <b>${
          buyer.contactName || buyer.contactEmail
        }</b>, your buyer details were updated.</p>`,
      }),
    };

    await sendEmailWithRetry(transporter, mailOptions, 2);

    return { updated: buyer };
  },

  getAllBuyers: async (ownerId, { pageIndex = 0, pageSize = 10 } = {}) => {
  const owner = await buyersRepository.findOwnerById(ownerId);
  if (!owner) throw new Error("Business Owner not found");

  const buyers = await buyersRepository.findAllByOwner(ownerId);

  // Format timestamps or any transformations if needed
  const formattedBuyers = buyers.map((b) => formatTimestamps(b.toJSON()));

  const totalItems = formattedBuyers.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const start = pageIndex * pageSize;
  const paginatedBuyers = formattedBuyers.slice(start, start + pageSize);

  return {
    data: paginatedBuyers,
    totalItems,
    totalPages,
    pageIndex,
    pageSize,
  };
},

  getBuyerById: async (ownerId, buyerId) => {
    const buyer = await buyersRepository.findByOwnerAndId(ownerId, buyerId);
    if (!buyer) return { error: "Buyer not found under this business owner" };
    return { buyer };
  },

  searchBuyers: async (ownerId, query) => {
    const filters = {};
    if (query.country) filters.country = { [Op.iLike]: `%${query.country}%` };
    if (query.status) filters.status = query.status;
    if (typeof query.isVerified !== "undefined")
      filters.isVerified = query.isVerified;

    const buyers = await buyersRepository.searchBuyers(ownerId, filters);
    return { buyers };
  },

  becomeBusinessOwner: async (userEmail, data) => {
    const existingUser = await buyersRepository.findUserByEmail(userEmail);
  if (!existingUser) return { error: "User not found" };

  const existingOwner = await buyersRepository.findOwnerByEmail(userEmail);
  if (existingOwner)
    throw new Error("Business owner already registered for this user.");

  // Update user role and names
  await existingUser.update({
    first_name: data.first_name || existingUser.first_name,
    last_name: data.last_name || existingUser.last_name,
    roleId: 2, // business_owner
  });

  // Create new business owner
  const newOwner = await buyersRepository.createOwner({
    userId: existingUser.id,
    first_name: existingUser.first_name,
    last_name: existingUser.last_name,
    email: existingUser.email,
    phoneNumber: data.phoneNumber,
    businessName: data.businessName,
    registrationNumber: data.registrationNumber,
    country: data.country,
    state: data.state,
    city: data.city,
    address: data.address,
    postalCode: data.postalCode,
    status: "active",
    is_verified: true,
    is_deleted: false,
    is_approved: true,
  });

  // Generate access token
  const tokenPayload = {
    id: newOwner.id,
    email: newOwner.email,
    userRole: "business_owner",
    businessName: newOwner.businessName,
    name: `${newOwner.first_name || ""} ${newOwner.last_name || ""}`.trim(),
  };
  const accessToken = accessTokenGenerator(tokenPayload);
  refreshTokenGenerator(data.res, tokenPayload);
  // -------------------------------
  // Send welcome email
  // -------------------------------
  try {
    const loginUrl = `${process.env.FRONTEND_URL || "https://localhost:5173"}/login`;

    const emailHtml = generateEmailTemplate({
      title: "Welcome to the Business Network!",
      subTitle: `Hi ${newOwner.first_name}, your business is now active.`,
      body: `
        <p>We’re excited to have your business <strong>${newOwner.businessName}</strong> on board.</p>
        <p>You can now manage buyers, track performance, and grow your network from your dashboard.</p>
        ${emailLoginButton({ url: loginUrl, label: "Go to Dashboard" })}
      `,
      footer: "If you didn’t request this registration, please ignore this email.",
    });

    await sendEmailWithRetry(transporter, {
      from: `"Business Platform" <${process.env.EMAIL_USER}>`,
      to: newOwner.email,
      subject: "Your Business Owner Account is Live",
      html: emailHtml,
    });
  } catch (err) {
    console.error("Failed to send welcome email:", err.message);
  }

  return { newOwner, accessToken };
  },

  checkRegistrationNumber: async (registrationNumber) => {
    const existingReg = await buyersRepository.findRegistrationNumber(
      registrationNumber
    );
    if (existingReg) return { error: "Registration number already in use" };
    return { success: "Registration number is available" };
  },
};
