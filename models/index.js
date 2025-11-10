import sequelize from "../config/db.js";
import Plan from "./plan.model.js";
import User from "./user.model.js";
import BusinessOwner from "./businessOwner.model.js";
import Buyer from "./buyers.model.js";
import Role from "./roles.model.js";
import Payment from "./payment.model.js";
// import BusinessOwner from "./businessOwner.model.js"
// import Buyer from "./buyers.model.js";
// import Role from "./roles.model.js";
import Product from "./product.model.js";
import Location from "./location.model.js";
import Offer from "./offer.model.js";
import OfferResult from "./offerResult.model.js";
import Subscription from "./subscription.model.js";
import OfferBuyer from "./offerBuyer.model.js";
import OfferVersion from "./offerVersion.model.js";
import OfferDraft from "./offerDraft.model.js";
import UserPlanUsage from "./UserPlanUsage.js";
// import PasswordResetOtp from "./passwordReset.model.js";
// (If you want associations later, you can add here)
// Example: Plan.hasMany(Subscription);
console.log("Loading models/index.js from:", import.meta.url);

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
  // PasswordResetOtp
};
Payment.belongsTo(User, { foreignKey: "userId" });
Payment.belongsTo(Plan, { foreignKey: "planId" });
User.hasMany(Payment, { foreignKey: "userId" });
Plan.hasMany(Payment, { foreignKey: "planId" });
