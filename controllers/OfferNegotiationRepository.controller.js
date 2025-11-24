import { OfferBuyer, OfferVersion } from "../models/index.js";
import { Op } from "sequelize";

function ensureUUID(id) {
  if (!/^[0-9a-fA-F-]{36}$/.test(String(id))) {
    throw new Error("buyerId is not a valid UUID");
  }
  return String(id).trim();
}

export async function findOfferBuyer(offerId, buyerId) {
  buyerId = ensureUUID(buyerId);
  return OfferBuyer.findOne({ where: { offerId, buyerId } });
}

export async function getLatestVersion(offerId, buyerId) {
  buyerId = ensureUUID(buyerId);
  return OfferVersion.findOne({
    where: { offerId, buyerId },
    order: [["versionNo", "DESC"]],
  });
}

export async function getVersionHistory(offerId, buyerId, maxVersionNo) {
  buyerId = ensureUUID(buyerId);
  return OfferVersion.findAll({
    where: { offerId, buyerId, versionNo: { [Op.lte]: maxVersionNo } },
    order: [["versionNo", "ASC"]],
  });
}


