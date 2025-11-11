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

Payment.belongsTo(User, { foreignKey: "userId" });
Payment.belongsTo(Plan, { foreignKey: "planId" });
User.hasMany(Payment, { foreignKey: "userId" });
Plan.hasMany(Payment, { foreignKey: "planId" });

OfferDraft.belongsTo(BusinessOwner, { foreignKey: "businessOwnerId" });

OfferDraft.hasMany(OfferDraftProduct, {
  foreignKey: "draftNo",
  as: "draftProducts",
});

OfferDraftProduct.belongsTo(OfferDraft, {
  foreignKey: "draftNo",
});

OfferDraftProduct.hasMany(SizeBreakup, {
  foreignKey: "offerDraftProductId",
  as: "sizeBreakups",
});

SizeBreakup.belongsTo(OfferDraftProduct, {
  foreignKey: "offerDraftProductId",
});

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
};
