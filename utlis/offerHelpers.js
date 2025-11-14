import sequelize from "../config/db.js";

export async function withTransaction(sequelize, callback) {
  const transaction = await sequelize.transaction();
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (err) {
    if (!transaction.finished) await transaction.rollback();
    throw err;
  }
}

export function validateOfferData(data, schema) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const messages =
      parsed.error?.errors?.map(e => e.message) ??
      [parsed.error?.message ?? "Invalid input data"];
    throw new Error(messages.join(", "));
  }
  return parsed.data;
}

export function ensureOfferOwnership(offer, user) {
  if (offer.businessOwnerId !== user.businessOwnerId) {
    throw new Error("This offer does not belong to you.");
  }
}

export function normalizeDateFields(obj, fields = ["offerValidityDate", "shipmentDate"]) {
  for (const key of fields) {
    if (obj[key] && typeof obj[key] === "string") obj[key] = new Date(obj[key]);
  }
}

export async function withTransactionOfferNegotiation(callback) {
  const transaction = await sequelize.transaction();
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (err) {
    if (!transaction.finished) await transaction.rollback();
    throw err;
  }
}

export async function ensureActiveOffer(Offer, offerId, transaction) {
  const offer = await Offer.findByPk(offerId, { transaction });
  if (!offer || offer.status === "close" || offer.isDeleted) {
    throw new Error("Offer not found or closed/deleted");
  }
  return offer;
}

export async function ensureActiveOwner(BusinessOwner, id, transaction) {
  const owner = await BusinessOwner.findOne({ where: { id, status: "active" }, transaction });
  if (!owner) throw new Error("Inactive or missing business owner");
  return owner;
}

export async function getLastVersion(OfferVersion, offerBuyerId, transaction) {
  return OfferVersion.findOne({
    where: { buyerId: offerBuyerId },
    order: [["versionNo", "DESC"]],
    transaction,
  });
}

