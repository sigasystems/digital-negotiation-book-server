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
import {Payment} from "../models/index.js";
import { generateBusinessOwnerEmail } from "../utlis/generateBusinessOwnerEmail .js";

export const buyerService = {
  addBuyer: async (ownerId, buyerData, owner) => {
    const { registrationNumber, contactEmail, contactName, contactPhone } = buyerData;

    const existingUser = await buyersRepository.findUserByEmail(contactEmail);
    if (existingUser) {
      const error = new Error("Buyer already added.  Please use different email!");
      error.statusCode = 400;
      throw error;
    }

    if (registrationNumber) {
      const existingReg = await buyersRepository.findRegistrationNumber(registrationNumber);
      if (existingReg) {
        const error = new Error("Registration number already in use");
        error.statusCode = 400;
        throw error;
      }
    }

    const contactPhoneVerifivation = await buyersRepository.findByContactPhone(contactPhone)
      if (contactPhoneVerifivation) {
      const error = new Error("Contact phone number already in use");
      error.statusCode = 400;
      throw error;
    }

    const password = generateSecurePassword(12);
    const hashedPassword = await bcrypt.hash(password, 12);

    let firstName = contactName || contactEmail;
    let lastName = "";
    if (contactName) {
      const parts = contactName.trim().split(" ");
      firstName = parts.shift();
      lastName = parts.join(" ");
    }

    const user = await buyersRepository.createUser({
      email: contactEmail,
      password_hash: hashedPassword,
      roleId: 3,
      first_name: firstName,
      last_name: lastName || null,
    });

    const newBuyer = await buyersRepository.create({
      ...buyerData,
      ownerId,
      userId: user.id,
      isVerified: true,
    });

    // Send welcome email
    const loginUrl = `${process.env.LOCAL_URL}/login`;
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
      const existing = await buyersRepository.findRegistrationNumber(updates.registrationNumber);
      if (existing && existing.id !== buyer.id) {
        throw new Error("Registration number already in use");
      }
    }

    // Contact email uniqueness
    if (updates.contactEmail) {
      const existing = await buyersRepository.findByContactEmail(updates.contactEmail);
      if (existing && existing.id !== buyer.id) {
        throw new Error("Contact email already in use");
      }
    }

    const changedFields = Object.keys(updates).reduce((acc, key) => {
      if (updates[key] !== buyer[key]) acc[key] = updates[key];
      return acc;
    }, {});

    if (Object.keys(changedFields).length === 0) {
      return buyer; // Nothing changed
    }
    console.log("changedFields",changedFields)
    await buyersRepository.update(buyer, changedFields);

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

    return buyer;
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
    console.log("services",ownerId, buyerId)
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

  await existingUser.update({
    first_name: data.first_name || existingUser.first_name,
    last_name: data.last_name || existingUser.last_name,
    roleId: 2, // business_owner
  });

  const payment = await Payment.findOne({
    where: { userId: existingUser.id },
    order: [["createdAt", "DESC"]],
  });
  if (payment) {
    await payment.update({ sendInvoice: true });
  }
  const newOwner = await buyersRepository.createOwner({
    userId: existingUser.id,
    first_name: existingUser.first_name,
    last_name: existingUser.last_name,
    email: existingUser.email,
    phoneNumber: data.phoneNumber,
    businessName: data.businessName,
    registrationNumber: data.registrationNumber,
    planId: data.planId,
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

  const tokenPayload = {
    id: newOwner.id,
    email: newOwner.email,
    userRole: "business_owner",
    businessName: newOwner.businessName,
    name: `${newOwner.first_name || ""} ${newOwner.last_name || ""}`.trim(),
  };
  const accessToken = accessTokenGenerator(tokenPayload);
  refreshTokenGenerator(data.res, tokenPayload);
  // try {
  //   const loginUrl = `${process.env.LOCAL_URL}/login`;
  //   const invoiceUrl = payment?.invoicePdf || null;

  //   // Generate professional HTML email
  //   const emailHtml = generateBusinessOwnerEmail({
  //     name: newOwner.first_name,
  //     businessName: newOwner.businessName,
  //     loginUrl,
  //     invoiceUrl,
  //   });
  //   // Setup email payload
  //   const mailOptions = {
  //     from: `"Business Platform" <${process.env.EMAIL_USER}>`,
  //     to: newOwner.email,
  //     subject: "🎉 Your Business Owner Account is Live",
  //     html: emailHtml,
  //   };
  //   await sendEmailWithRetry(transporter, mailOptions);
  //   console.log(`✅ Welcome email sent to ${newOwner.email}`);
  // } catch (err) {
  //   console.error("❌ Failed to send welcome email:", err.message);
  // }

  setTimeout(async () => {
  try {
    const loginUrl = `${process.env.LOCAL_URL}/login`;
    const invoiceUrl = payment?.invoicePdf || null;

    const emailHtml = generateBusinessOwnerEmail({
      name: newOwner.first_name,
      businessName: newOwner.businessName,
      loginUrl,
      invoiceUrl,
    });

    const mailOptions = {
      from: `"Business Platform" <${process.env.EMAIL_USER}>`,
      to: newOwner.email,
      subject: "🎉 Your Business Owner Account is Live",
      html: emailHtml,
    };

    await sendEmailWithRetry(transporter, mailOptions);
    console.log(`✅ Welcome email sent to ${newOwner.email}`);
  } catch (err) {
    console.error("❌ Failed to send welcome email:", err.message);
  }
}, 1 * 60 * 1000); // 1 minutes


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
