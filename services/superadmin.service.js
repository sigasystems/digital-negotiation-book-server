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

export const superAdminService = {
  createBusinessOwner: async (data) => {
    const transaction = await superAdminRepo.transaction();

    try {
      const parsedData = businessOwnerSchema.safeParse(data);
      if (!parsedData.success) {
        const errors = parsedData.error.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        throw { statusCode: 400, message: "Validation Error", details: errors };
      }

      const { phoneNumber, email, first_name, last_name, businessName } = parsedData.data;
      const phoneObj = parsePhoneNumberFromString(phoneNumber);
      if (!phoneObj || !phoneObj.isValid()) {
        throw { statusCode: 400, message: "Invalid mobile number format." };
      }
      const normalizedPhone = phoneObj.number;

      if (await superAdminRepo.findByPhone(normalizedPhone)) {
        throw { statusCode: 400, message: "Mobile number already exists." };
      }

      if (await superAdminRepo.findByEmail(email)) {
        throw { statusCode: 400, message: "Email already exists." };
      }

      // Generate password and hash
      const plainPassword = generateSecurePassword(12);
      const passwordHash = await bcrypt.hash(plainPassword, 10);

      // 1️⃣ Create User
      const user = await superAdminRepo.createUser(
        { email, first_name, last_name, password_hash: passwordHash, roleId: 2 },
        transaction
      );

      // 2️⃣ Create Business Owner
      const owner = await superAdminRepo.createOwner(
        { ...parsedData.data, phoneNumber: normalizedPhone, userId: user.id },
        transaction
      );

      // 3️⃣ Send welcome email
      const mailOptions = {
        from: `"Platform Admin" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Welcome to the Digital Negotiation Book, ${businessName}!`,
        html: generateEmailTemplate({
          title: `Welcome aboard, ${businessName}! 🎉`,
          subTitle: "Your business owner account has been created successfully.",
          body: `
            <p><b>Business Name:</b> ${businessName}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Password:</b> ${plainPassword}</p>
            <p>${emailLoginButton({ url: `${process.env.CLIENT_URL}/login`, label: "Log in" })}</p>
          `,
          footer: "If you did not make this request, please contact support immediately.",
        }),
      };

      const emailResult = await sendEmailWithRetry(transporter, mailOptions, 2);
      if (!emailResult.success) {
        throw { statusCode: 502, message: "Business owner created but email could not be sent." };
      }

      await transaction.commit();
      return formatTimestamps(owner.toJSON());
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

 getAllBusinessOwners: async ({ pageIndex = 0, pageSize = 10, withBuyers = false }) => {
  const options = withBuyers ? superAdminRepo.includeBuyers() : {};

  // Fetch all owners first (or you can adapt to use a DB-level pagination if supported)
  const owners = await superAdminRepo.findAll(options);
  const formattedOwners = owners.map((owner) => formatTimestamps(owner.toJSON()));

  const totalItems = formattedOwners.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Calculate paginated slice
  const start = pageIndex * pageSize;
  const paginatedOwners = formattedOwners.slice(start, start + pageSize);

  return {
    data: paginatedOwners,
    totalItems,
    totalPages,
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
      throw { statusCode: 400, message: "Validation Error", details: errors };
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
};
