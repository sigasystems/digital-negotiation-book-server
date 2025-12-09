import bcrypt from "bcrypt";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import transporter from "../config/nodemailer.js";
import { businessOwnerSchema } from "../validations/business.validation.js";
import { sendEmailWithRetry } from "../utlis/emailTemplate.js";
import formatTimestamps from "../utlis/formatTimestamps.js";
import { superAdminRepo } from "../repositories/superadmin.repository.js";
import generateSecurePassword from "../utlis/genarateSecurePassword.js";
import { generateEmailTemplate } from "../utlis/emailTemplate.js";
import {emailLoginButton} from "../utlis/emailTemplate.js";
import stripe from "../config/stripe.js";

export const superAdminService = {
  // createBusinessOwner: async (data) => {
  //   const transaction = await superAdminRepo.transaction();

  //   try {
  //     const parsedData = businessOwnerSchema.safeParse(data);
  //     if (!parsedData.success) {
  //       const errors = parsedData.error.issues.map((e) => ({
  //         field: e.path.join("."),
  //         message: e.message,
  //       }));
  //       throw { statusCode: 400, message: "Validation Error", details: errors };
  //     }

  //     const { phoneNumber, email, first_name, last_name, businessName } = parsedData.data;
  //     const phoneObj = parsePhoneNumberFromString(phoneNumber);
  //     if (!phoneObj || !phoneObj.isValid()) {
  //       throw { statusCode: 400, message: "Invalid mobile number format." };
  //     }
  //     const normalizedPhone = phoneObj.number;

  //     if (await superAdminRepo.findByPhone(normalizedPhone)) {
  //       throw { statusCode: 400, message: "Mobile number already exists." };
  //     }

  //     if (await superAdminRepo.findByEmail(email)) {
  //       throw { statusCode: 400, message: "Email already exists." };
  //     }

  //     // 🔍 NEW: Check for duplicate business name
  //     const existingBusiness = await superAdminRepo.findBusinessOwnerByName(businessName);
  //     if (existingBusiness) {
  //       throw { statusCode: 400, message: `Business name '${businessName}' already exists.` };
  //     }

  //     // Generate password and hash
  //     const plainPassword = generateSecurePassword(12);
  //     const passwordHash = await bcrypt.hash(plainPassword, 10);

  //     // 1️⃣ Create User
  //     const user = await superAdminRepo.createUser(
  //       { email, first_name, last_name, password: passwordHash, roleId: 2 },
  //       transaction
  //     );

  //     // 2️⃣ Create Business Owner
  //     const owner = await superAdminRepo.createOwner(
  //       { ...parsedData.data, phoneNumber: normalizedPhone, userId: user.id },
  //       transaction
  //     );

  //     // 3️⃣ Send welcome email
  //     const mailOptions = {
  //       from: `"Platform Admin" <${process.env.EMAIL_USER}>`,
  //       to: email,
  //       subject: `Welcome to the Digital Negotiation Book, ${businessName}!`,
  //       html: generateEmailTemplate({
  //         title: `Welcome aboard, ${businessName}! 🎉`,
  //         subTitle: "Your business owner account has been created successfully.",
  //         body: `
  //           <p><b>Business Name:</b> ${businessName}</p>
  //           <p><b>Email:</b> ${email}</p>
  //           <p><b>Password:</b> ${plainPassword}</p>
  //           <div style="margin: 20px 0; padding: 10px; background-color: #fff8e1; border-left: 4px solid #fbc02d; border-radius: 4px;">
  //             <p style="margin: 0; font-weight: bold; color: #795548; font-size: 15px;">
  //               ⚠️ Make sure to change your password immediately!
  //             </p>
  //           </div>
  //           <p>${emailLoginButton({ url: `${process.env.CLIENT_URL}/login`, label: "Log in" })}</p>
  //         `,
  //         footer: "If you did not make this request, please contact support immediately.",
  //       }),
  //     };

  //     const emailResult = await sendEmailWithRetry(transporter, mailOptions, 2);
  //     if (!emailResult.success) {
  //       throw { statusCode: 502, message: "Business owner created but email could not be sent." };
  //     }

  //     await transaction.commit();
  //     return formatTimestamps(owner.toJSON());
  //   } catch (err) {
  //     await transaction.rollback();
  //     throw err;
  //   }
  // },


 createBusinessOwner: async (data) => {
  const transaction = await superAdminRepo.transaction();
  console.log('start....');
  try {
    // 1. Validate input
    const parsed = businessOwnerSchema.safeParse(data);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message || "fdf",
      }));
      throw { statusCode: 400, message: "Validation Error in parse", details: errors };
    }

    const {
      phoneNumber,
      email,
      first_name,
      last_name,
      businessName
    } = parsed.data;

    // 2. Validate mobile number format
    const phoneObj = parsePhoneNumberFromString(phoneNumber);
    if (!phoneObj || !phoneObj.isValid()) {
      throw { statusCode: 400, message: "Invalid mobile number format" };
    }
    const normalizedPhone = phoneObj.number;

    // 3. Check duplicates
    if (await superAdminRepo.findByPhone(normalizedPhone)) {
      throw { statusCode: 400, message: "Mobile number already exists" };
    }

    if (await superAdminRepo.findByEmail(email)) {
      throw { statusCode: 400, message: "Email already exists" };
    }

    const existingBusiness = await superAdminRepo.findBusinessOwnerByName(businessName);
    if (existingBusiness) {
      throw { statusCode: 400, message: `Business name '${businessName}' already exists` };
    }

    // 4. Generate password
    const plainPassword = generateSecurePassword(12);
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    // 5. Create user
    const user = await superAdminRepo.createUser(
      {
        email,
        first_name,
        last_name,
        password: passwordHash,
        roleId: 2,
      },
      transaction
    );

    // 6. Create business owner
    const owner = await superAdminRepo.createOwner(
      {
        ...parsed.data,
        phoneNumber: normalizedPhone,
        userId: user.id,
      },
      transaction
    );

    // 7. Stripe payment link
    const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY);
    console.log('stripe client.....',stripeClient);
    const session = await stripeClient.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.BUSINESS_OWNER_ONBOARD_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/success?ownerId=${owner.id}`,
      cancel_url: `${process.env.CLIENT_URL}/`,
      metadata: {
        ownerId: owner.id,
        userId: user.id,
        requestType: "BUSINESS_OWNER_ONBOARD",
      },
    });

    console.log('session.....',session);

    const paymentUrl = session.url;
    console.log('payment url.....',paymentUrl);

    // 8. Email
    const mailOptions = {
      from: `"Platform Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Complete your business onboarding - ${businessName}`,
      html: generateEmailTemplate({
        title: `Welcome ${businessName}`,
        subTitle: "Your account has been created. Complete payment to activate access.",
        body: `
          <p><b>Login Email:</b> ${email}</p>
          <p><b>Temporary Password:</b> ${plainPassword}</p>

          <p style="margin-top: 20px;">
            ${emailLoginButton({
              url: paymentUrl,
              label: "Complete Payment",
            })}
          </p>

          <p>Your dashboard access will activate automatically after payment.</p>
        `,
        footer: "Contact support if you face any issues.",
      }),
    };

    const emailResult = await sendEmailWithRetry(transporter, mailOptions, 2);
    if (!emailResult.success) {
      throw { statusCode: 502, message: "Business owner created but email failed" };
    }

    await transaction.commit();
    return formatTimestamps(owner.toJSON());
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
 } ,

  getAllBusinessOwners: async ({ pageIndex = 0, pageSize = 10, withBuyers = false }) => {
  const options = withBuyers ? superAdminRepo.includeBuyers() : {};

  // Fetch all owners first (or you can adapt to use a DB-level pagination if supported)
  const owners = await superAdminRepo.findAll(options);
  const formattedOwners = owners.map((owner) => formatTimestamps(owner.toJSON()));

  const totalItems = formattedOwners.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const start = pageIndex * pageSize;
  const paginatedOwners = formattedOwners.slice(start, start + pageSize);

  const totalActive = formattedOwners.filter((o) => o.status === "active" && !o.isDeleted).length;
  const totalInactive = formattedOwners.filter((o) => o.status === "inactive" && !o.isDeleted).length;
  const totalDeleted = formattedOwners.filter((o) => o.isDeleted === true).length;

  return {
    data: paginatedOwners,
    totalItems,
    totalPages,
    totalActive,
    totalInactive,
    totalDeleted,
    pageIndex,
    pageSize,
  };
  },


  getBusinessOwnerById: async (id) => {
    const owner = await superAdminRepo.findById(id, { paranoid: false });
    if (!owner) throw { statusCode: 404, message: "Business owner not found" };
    return formatTimestamps(owner.toJSON());
  },

  updateBusinessOwner: async (id, data) => {
    const parsedData = businessOwnerSchema.safeParse(data);
    if (!parsedData.success) {
      const errors = parsedData.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw { statusCode: 400, message: "Validation Error in updatebusiness owner", details: errors };
    }

    const owner = await superAdminRepo.findById(id);
    if (!owner) throw { statusCode: 404, message: "Business owner not found" };
    if (owner.is_deleted) throw { statusCode: 400, message: "Cannot update a deleted business owner" };

    // Mobile validation
    if (parsedData.data.mobile) {
      const mobileRegex = /^[0-9]{10}$/;
      if (!mobileRegex.test(parsedData.data.mobile)) {
        throw { statusCode: 400, message: "Invalid mobile number format." };
      }

      const existingOwner = await superAdminRepo.findByPhone(parsedData.data.mobile);
      if (existingOwner && existingOwner.id !== id) {
        throw { statusCode: 400, message: "Mobile number already exists." };
      }
    }

    await superAdminRepo.updateOwner(owner, parsedData.data);

    // Optionally send email notification here (reuse your email template code)
    return formatTimestamps(owner.toJSON());
  },

  activateBusinessOwner: async (ownerId) => {
    const owner = await superAdminRepo.findById(ownerId, {paranoid: false})
    if (!owner) throw { statusCode: 404, message: "Business owner not found" };
    return await superAdminRepo.activateOwner(ownerId);
  },

  deactivateBusinessOwner: async (ownerId) => {
  return await superAdminRepo.deactivateOwner(ownerId);
},

  softDeleteBusinessOwner: async (ownerId) => {
    const owner = await superAdminRepo.findById(ownerId, {paranoid: false})
    if (owner.is_deleted) throw { statusCode: 400, message: "Can not delete already deleted business owner." };
    return await superAdminRepo.softDeleteOwner(ownerId);
  },

  reviewBusinessOwner: async (owner, action) => {
    const isApproved = action === "approve";
    return superAdminRepo.reviewOwner(owner, isApproved);
  },

  searchBusinessOwners: async (filters = {}, { limit = 10, offset = 0 }) => {
  const normalized = {
    first_name: filters.first_name?.toString().trim() || undefined,
    last_name: filters.last_name?.toString().trim() || undefined,
    email: filters.email?.toString().trim() || undefined,
    businessName: filters.businessName?.toString().trim() || undefined,
    phoneNumber: filters.phoneNumber?.toString().trim() || undefined,
    postalCode: filters.postalCode?.toString().trim() || undefined,
    status: filters.status?.toString().trim() || undefined,
  };

  const { count, rows } = await superAdminRepo.searchBusinessOwners(normalized, {
    limit: Number(limit),
    offset: Number(offset),
  });

  const formatted = rows.map((owner) => formatTimestamps(owner.toJSON()));

  return {
    businessOwners: formatted,
    totalItems: count,
    totalPages: Math.ceil(count / limit),
    currentPage: Math.floor(offset / limit),
  };
},
}
