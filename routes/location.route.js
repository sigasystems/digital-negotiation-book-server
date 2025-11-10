import express from "express";
import { locationController } from "../controllers/index.js";
import { authenticateJWT } from "../middlewares/authenticateJWT.js";
import { checkPlanLimit } from "../middlewares/checkPlanLimit.js";

const router = express.Router();

router.post("/add-location", authenticateJWT ,checkPlanLimit("location"), locationController.createLocations);
router.get("/getall-locations",authenticateJWT, locationController.getAllLocations);
router.get("/getlocation/:id", authenticateJWT , locationController.getLocationById);
router.put("/update-location/:id", authenticateJWT , locationController.updateLocation);
router.delete("/delete-location/:id", authenticateJWT ,locationController.deleteLocation);
router.get("/search", authenticateJWT , locationController.searchLocations);

export default router;
