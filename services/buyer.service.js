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
import {Payment, Plan, Subscription, UserPlanUsage} from "../models/index.js";
import { generateBusinessOwnerEmail } from "../utlis/generateBusinessOwnerEmail .js";
import stripe from "../config/stripe.js";

export const buyerService = {
  addBuyer: async (ownerId, buyerData, owner) => {
    const { registrationNumber, contactEmail, contactName, contactPhone } = buyerData;

    const existingUser = await buyersRepository.findUserByEmail(contactEmail);  
    if (existingUser) {
      if (existingUser.roleId === 3) {
      const error = new Error("Buyer already added. Please use different email!");
        error.statusCode = 400;
        throw error;
      }
      await buyersRepository.updateUserRole(existingUser.id, 3);
      
      const existingBuyerForUser = await buyersRepository.findBuyerByUserId(existingUser.id);
      if (existingBuyerForUser) {
        const error = new Error("Buyer already exists for this user");
      error.statusCode = 400;
      throw error;
    }

      const newBuyer = await buyersRepository.create({
        ...buyerData,
        ownerId,
        userId: existingUser.id,
        isVerified: true,
      });

      const loginUrl = `${process.env.CLIENT_URL}/login`;
      const mailOptions = {
        from: `"${owner.businessName}" <${process.env.EMAIL_USER}>`,
        to: newBuyer.contactEmail,
        subject: `Buyer account updated for ${owner.businessName}`,
        html: generateEmailTemplate({
          title: `Account Updated for ${owner.businessName}`,
          subTitle: "Your account has been granted buyer access",
          body: `
            <p>Hello <b>${newBuyer.contactName || newBuyer.contactEmail}</b>,</p>
            <p>Your existing account has been granted buyer access to <b>${owner.businessName}</b>.</p>
            <p>You can now log in with your existing credentials.</p>
            
            <p>
              <a href="${loginUrl}" 
                style="display:inline-block; background:#4CAF50; color:white; padding:12px 24px; 
                      text-decoration:none; border-radius:6px; font-weight:bold;">
                Login
              </a>
            </p>
          `,
        }),
      };

      await sendEmailWithRetry(transporter, mailOptions, 2);

      return { created: newBuyer, userUpdated: true };
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
      password: hashedPassword,
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

    const loginUrl = `${process.env.CLIENT_URL}/login`;
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

            <div style="margin: 20px 0; padding: 10px; background-color: #fff8e1; border-left: 4px solid #fbc02d; border-radius: 4px;">
              <p style="margin: 0; font-weight: bold; color: #795548; font-size: 15px;">
                ⚠️ Please log in and change your password immediately.
              </p>
            </div>

            <p>
              <a href="${loginUrl}" 
                style="display:inline-block; background:#4CAF50; color:white; padding:12px 24px; 
                      text-decoration:none; border-radius:6px; font-weight:bold;">
                Login
              </a>
            </p>
        `,
      }),
    };

    await sendEmailWithRetry(transporter, mailOptions, 2);

    return { created: newBuyer, userUpdated: false };
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

  const formattedBuyers = buyers.map((b) => formatTimestamps(b.toJSON()));

  const totalItems = formattedBuyers.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const totalActive = formattedBuyers.filter((b) => b.status === "active" && !b.isDeleted).length;
  const totalInactive = formattedBuyers.filter((b) => b.status === "inactive" && !b.isDeleted).length;
  const totalDeleted = formattedBuyers.filter((b) => b.isDeleted === true).length;

  const start = pageIndex * pageSize;
  const paginatedBuyers = formattedBuyers.slice(start, start + pageSize);

  return {
    data: paginatedBuyers,
    totalItems,
    totalPages,
    totalActive,
    totalInactive,
    totalDeleted,
    pageIndex,
    pageSize,
  };
},

  getBuyersList: async (ownerId) => {
    const owner = await buyersRepository.findOwnerById(ownerId);
    if (!owner) throw new Error("Business Owner not found");

    const buyers = await buyersRepository.findAllByOwnerMinimal(ownerId);

    const activeBuyers = buyers
      .filter(b => !b.isDeleted)
      .map(b => ({
        id: b.id,
        buyersCompanyName: b.buyersCompanyName
      }))
      .sort((a, b) => a.buyersCompanyName.localeCompare(b.buyersCompanyName, "en", { sensitivity: "base" }));

    return activeBuyers;
  },

  getBuyerById: async (ownerId, buyerId) => {
    const buyer = await buyersRepository.findByOwnerAndId(ownerId, buyerId);
    if (!buyer) return { error: "Buyer not found under this business owner" };
    return { buyer };
  },

  searchBuyers: async (ownerId, query = {}, pagination = {}) => {
    const filters = {};
    filters.ownerId = ownerId;

    const country = query.country?.trim();
    const productName = query.productName?.trim();
    const locationName = query.locationName?.trim();
    const status = query.status?.trim();
    const isVerified =
      typeof query.isVerified !== "undefined" ? query.isVerified : undefined;

    if (country) filters.country = { [Op.iLike]: `%${country}%` };
    if (productName) filters.productName = { [Op.iLike]: `%${productName}%` };
    if (locationName) filters.locationName = { [Op.iLike]: `%${locationName}%` };
    if (status) filters.status = status;
    if (typeof isVerified !== "undefined") filters.isVerified = isVerified;

    const limit = Number(pagination.limit ?? query.limit ?? 10);
    const page = Number(pagination.page ?? query.page ?? 0);
    const offset = page * limit;

    const result = await buyersRepository.searchBuyers(ownerId, filters, {
      limit,
      offset,
    });

    return result;
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
    paymentId: data.paymentId,
  });

  const payment = await Payment.findOne({
    where: { userId: existingUser.id },
    order: [["createdAt", "DESC"]],
  });
  
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
    paymentId: data.paymentId,   // ✅ add this
    postalCode: data.postalCode,
    status: "active",
    is_verified: true,
    is_deleted: false,
    is_approved: true,
  });
  // ✅ only update if payment exists
if (payment) {
  await payment.update({
    sendInvoice: true,
    businessOwnerId: newOwner.id,
  });

  await newOwner.update({
    paymentId: payment.id,
  });
}

// ✅ determine endDate using Stripe if subscriptionId is available
let endDate = new Date(); // fallback
if (data.subscriptionId) {
  try {
    const stripeSub = await stripe.subscriptions.retrieve(data.subscriptionId);
    if (stripeSub?.current_period_end) {
      endDate = new Date(stripeSub.current_period_end * 1000); // Stripe returns seconds, JS needs ms
    }
  } catch (err) {
    console.error("⚠️ Failed to fetch Stripe subscription period:", err.message);
  }
} else {
  // fallback if no subscriptionId passed — manual calc
  if (data.billingCycle === "monthly") {
    endDate.setMonth(endDate.getMonth() + 1);
  } else if (data.billingCycle === "yearly") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }
}

// 🔥 Create Subscription entry
await Subscription.create({
   userId: existingUser.id,
  subscriptionId: data.subscriptionId || "manual_" + Date.now(),
  planName: data.planName || "Unknown Plan",
  status: "active",
  startDate: new Date(),
  paymentStatus: "paid",
  endDate, 
  trialEnd: null,
  maxLocations: data.maxLocations || 5,
  maxProducts: data.maxProducts || 100,
  maxOffers: data.maxOffers || 50,
  maxBuyers: data.maxBuyers || 100,
});

const plan = await Plan.findOne({ where: { id: data.planId } });
if (!plan) throw new Error("Invalid planId");

const planKey = plan.key;
await UserPlanUsage.findOrCreate({
  where: { userId: existingUser.id },
  defaults: {
    userId: existingUser.id,
    usedLocations: 0,
    usedProducts: 0,
    usedOffers: 0,
    usedBuyers: 0,
    planKey,
  },
});

  const tokenPayload = {
    id: newOwner.id,
    email: newOwner.email,
    userRole: "business_owner",
    businessName: newOwner.businessName,
    name: `${newOwner.first_name || ""} ${newOwner.last_name || ""}`.trim(),
  };
  const accessToken = accessTokenGenerator(tokenPayload);
  const refreshToken = refreshTokenGenerator(tokenPayload);
  setTimeout(async () => {
  try {
    const loginUrl = `${process.env.CLIENT_URL}/login`;
    const invoiceUrl = payment?.invoicePdf || null;

    const emailHtml = generateBusinessOwnerEmail({
      name: newOwner.first_name,
      businessName: newOwner.businessName,
      plan: plan.name,
      planPrice: plan.priceMonthly,
      currency: plan.currency,
      email: newOwner.email,
      phoneNumber: newOwner.phoneNumber,
      country: newOwner.country,
      state: newOwner.state,
      city: newOwner.city,
      address: newOwner.address,
      postalCode: newOwner.postalCode,
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
  } catch (err) {
    console.error("❌ Failed to send welcome email:", err.message);
  }
},10 * 1000); 


  return { newOwner, accessToken, refreshToken, payment };
},

  checkRegistrationNumber: async (registrationNumber) => {
    const existingReg = await buyersRepository.findRegistrationNumber(
      registrationNumber
    );
    if (existingReg) return { error: "Registration number already in use" };
    return { success: "Registration number is available" };
  },
};
