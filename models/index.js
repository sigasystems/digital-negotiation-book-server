import sequelize from "../config/db.js";

import Plan from "./plan.model.js";
import User from "./user.model.js";
import BusinessOwner from "./businessOwner.model.js";
import Buyer from "./buyers.model.js";
import Role from "./roles.model.js";
import Payment from "./payment.model.js";
import Product from "./product.model.js";
import Location from "./location.model.js";
import Offer from "./offer.model.js";
import OfferResult from "./offerResult.model.js";
import Subscription from "./subscription.model.js";
import OfferBuyer from "./offerBuyer.model.js";
import OfferVersion from "./offerVersion.model.js";
import OfferDraft from "./offerDraft.model.js";
import SizeBreakup from "./sizeBreakup.js";
import UserPlanUsage from "./UserPlanUsage.js";
import OfferDraftProduct from "./offerDraftProduct.model.js";
import OfferSizeBreakup from "./offerSizeBreakup.model.js";
import OfferProduct from "./offerProduct.model.js";
import Country from "./country.model.js";

Payment.belongsTo(User, { foreignKey: "userId" });
Payment.belongsTo(Plan, { foreignKey: "planId" });
User.hasMany(Payment, { foreignKey: "userId" });
Plan.hasMany(Payment, { foreignKey: "planId" });

OfferDraft.belongsTo(BusinessOwner, {
  foreignKey: "businessOwnerId",
  as: "businessOwner",
});

OfferDraft.hasMany(OfferDraftProduct, {
  foreignKey: "draftNo",
  as: "draftProducts",
});

OfferDraftProduct.belongsTo(OfferDraft, {
  foreignKey: "draftNo",
  as: "offerDraft",
});

OfferDraftProduct.hasMany(SizeBreakup, {
  foreignKey: "offerDraftProductId",
  as: "sizeBreakups",
});

SizeBreakup.belongsTo(OfferDraftProduct, {
  foreignKey: "offerDraftProductId",
  as: "offerDraftProduct",
});

Offer.hasMany(OfferProduct, { foreignKey: "offerId", as: "products" });
OfferProduct.belongsTo(Offer, { foreignKey: "offerId", as: "offer" });

OfferProduct.hasMany(OfferSizeBreakup, {
  foreignKey: "offerProductId",
  as: "sizeBreakups",
});
OfferSizeBreakup.belongsTo(OfferProduct, {
  foreignKey: "offerProductId",
  as: "offerProduct",
});

Location.belongsTo(Country, {
  foreignKey: "countryId",
  as: "country",
});

OfferBuyer.hasMany(OfferVersion, {
  foreignKey: "offerId",
  otherKey: "buyerId",
  as: "versions"
});

OfferVersion.belongsTo(OfferBuyer, {
  foreignKey: "offerId",
  otherKey: "buyerId",
  as: "offerBuyer"
});

OfferVersion.hasMany(OfferResult, {
  foreignKey: "offerVersionId",
  as: "results",
});

OfferResult.belongsTo(OfferVersion, {
  foreignKey: "offerVersionId",
  as: "offerVersion",
});

Offer.hasMany(OfferResult, {
  foreignKey: "offerId",
  as: "results",
});

OfferResult.belongsTo(Offer, {
  foreignKey: "offerId",
  as: "offer",
});

Buyer.hasMany(OfferResult, {
  foreignKey: "buyerId",
  as: "offerResults",
});

OfferResult.belongsTo(Buyer, {
  foreignKey: "buyerId",
  as: "buyer",
});

BusinessOwner.hasMany(OfferResult, {
  foreignKey: "ownerId",
  as: "offerResults",
});

OfferResult.belongsTo(BusinessOwner, {
  foreignKey: "ownerId",
  as: "owner",
});


// Country.hasMany(Location, { foreignKey: "countryId" });
// Location.belongsTo(Country, { foreignKey: "countryId" });

export {
  sequelize,
  User,
  Plan,
  Payment,
  BusinessOwner,
  Buyer,
  Role,
  OfferDraft,
  Location,
  Product,
  Offer,
  OfferBuyer,
  OfferVersion,
  OfferResult,
  Subscription,
  UserPlanUsage,
  SizeBreakup,
  OfferDraftProduct,
  OfferProduct,
  OfferSizeBreakup,
  Country
};
