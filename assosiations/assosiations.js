// import User from './User.js';
// import Role from './Role.js';
// import Plan from './Plan.js';
// import Payment from './Payment.js';
// import BusinessOwner from './BusinessOwner.js';
// import Buyer from './Buyer.js';
// import Offer from './Offer.js';
// import OfferBuyer from './OfferBuyer.js';
// import OfferDraft from './OfferDraft.js';
// import OfferVersion from './OfferVersion.js';
// import OfferResult from './OfferResult.js';
// import Product from './Product.js';
// import Subscription from './Subscription.js';

// export const initAssociations = () => {
//   // 🔗 User & Role
//   Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
//   User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

//   // 🔗 User & BusinessOwner
//   User.hasOne(BusinessOwner, { foreignKey: 'userId', as: 'businessOwner' });
//   BusinessOwner.belongsTo(User, { foreignKey: 'userId', as: 'user' });

//   // 🔗 Plan & BusinessOwner
//   Plan.hasMany(BusinessOwner, { foreignKey: 'planId', as: 'businessOwners' });
//   BusinessOwner.belongsTo(Plan, { foreignKey: 'planId', as: 'plan' });

//   // 🔗 Payment
//   Payment.belongsTo(User, { foreignKey: 'userId' });
//   Payment.belongsTo(Plan, { foreignKey: 'planId' });
//   BusinessOwner.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });
//   Payment.hasOne(BusinessOwner, { foreignKey: 'paymentId', as: 'businessOwner' });

//   // 🔗 BusinessOwner & Buyer
//   BusinessOwner.hasMany(Buyer, { foreignKey: 'ownerId', as: 'buyers' });
//   Buyer.belongsTo(BusinessOwner, { foreignKey: 'ownerId', as: 'businessOwner' });

//   // 🔗 BusinessOwner & Offer
//   BusinessOwner.hasMany(Offer, { foreignKey: 'businessOwnerId', as: 'activeOffers' });
//   Offer.belongsTo(BusinessOwner, { foreignKey: 'businessOwnerId', as: 'businessOwner' });

//   // 🔗 Offer & OfferBuyer
//   Offer.hasMany(OfferBuyer, { foreignKey: 'offerId', as: 'offerBuyers' });
//   OfferBuyer.belongsTo(Offer, { foreignKey: 'offerId', as: 'offer' });

//   Buyer.hasMany(OfferBuyer, { foreignKey: 'buyerId', as: 'buyerOffers' });
//   OfferBuyer.belongsTo(Buyer, { foreignKey: 'buyerId', as: 'buyer' });

//   // Optional link to owner
//   BusinessOwner.hasMany(OfferBuyer, { foreignKey: 'ownerId', as: 'ownerOffers' });
//   OfferBuyer.belongsTo(BusinessOwner, { foreignKey: 'ownerId', as: 'owner' });

//   // 🔗 BusinessOwner & OfferDraft
//   BusinessOwner.hasMany(OfferDraft, { foreignKey: 'businessOwnerId', as: 'drafts' });
//   OfferDraft.belongsTo(BusinessOwner, { foreignKey: 'businessOwnerId', as: 'businessOwner' });

//   // 🔗 OfferVersion & OfferResult
//   OfferVersion.hasMany(OfferResult, { foreignKey: 'OfferVersionId', as: 'results' });
//   OfferResult.belongsTo(OfferVersion, { foreignKey: 'OfferVersionId', as: 'OfferVersion' });

//   // 🔗 OfferBuyer & OfferVersion
//   OfferBuyer.hasMany(OfferVersion, { foreignKey: 'offerBuyerId', as: 'versions' });
//   OfferVersion.belongsTo(OfferBuyer, { foreignKey: 'offerBuyerId', as: 'offerBuyer' });

//   // 🔗 Product & BusinessOwner
//   Product.belongsTo(BusinessOwner, { foreignKey: 'ownerId', as: 'owner' });
//   BusinessOwner.hasMany(Product, { foreignKey: 'ownerId', as: 'products' });

//   // 🔗 Subscription & User
//   Subscription.belongsTo(User, { foreignKey: 'userId' });
//   User.hasMany(Subscription, { foreignKey: 'userId' });
// };
