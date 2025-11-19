import express from "express";
import { locationController } from "../controllers/index.js";
import { authenticateJWT } from "../middlewares/authenticateJWT.js";
import { checkPlanLimit } from "../middlewares/checkPlanLimit.js";
import checkPlanValidity from "../middlewares/checkPlanValidity.js";

const router = express.Router();

router.post("/", authenticateJWT ,  checkPlanValidity ,checkPlanLimit("location"), locationController.createLocations);
router.get("/",authenticateJWT, locationController.getAllLocations);
router.get("/:id", authenticateJWT , locationController.getLocationById);
router.put("/:id", authenticateJWT , locationController.updateLocation);
router.delete("/:id", authenticateJWT ,locationController.deleteLocation);
router.get("/search", authenticateJWT , locationController.searchLocations);

export default router;
