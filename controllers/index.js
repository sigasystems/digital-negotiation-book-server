// controllers/index.js
  
  import * as planController from "./plan.controller.js"; // include full path + .js
  // import * as authController from "./authControllers/auth.controller.js"
  // import * as paymentController from "./paymentController/payment.controller.js"
  // import * as businessOwnerController from "./superadminController/sa.businessowner.controller.js"
  // import * as businessOwnerControllers from "./businessOwnerControllers/businessOwner.controllers.js"
  // import * as boBuyersControllers from "./businessOwnerControllers/bo.buyers.controllers.js"
  // import * as offerDraftControllers from "./offerDraftControllers/offerDraft.controller.js"
  import * as productController from ".//product.controller.js";
  import * as locationController from "./location.controller.js";
  import * as authcontroller from "./auth.controller.js"
  import * as businessOwnerController from "./businessOwner.controller.js"
  import *  as superadminController from "./sa.businessowner.controller.js"

  
  // import * as boOfferControllers from "./offerControllers/bo.offer.controllers.js"
  // import * as offerActionsControllers from "./offerControllers/offerAction.controllers.js"

  // Later you can add more controllers like:
  // import * as userController from "./userController.js";

  export {
    planController,
    // userController,
    authcontroller,
    // paymentController,
    // businessOwnerController,
    businessOwnerController,
    // boBuyersControllers,
    // offerDraftControllers,
    productController,
    locationController,
    superadminController,
    // boOfferControllers,
    // offerActionsControllers
  };
