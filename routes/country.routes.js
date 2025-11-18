import express from "express";
import { authenticateJWT } from "../middlewares/authenticateJWT.js";
import * as countryController from "../controllers/country.controller.js";

const router = express.Router();

router.use(authenticateJWT);

router
  .route("/")
  .post(countryController.createCountry)
  .get(countryController.getCountries);

router.get("/search", countryController.searchCountry);

router.get("/all",countryController.getAllCountries)

router
  .route("/:id")
  .get(countryController.getCountryById)
  .put(countryController.updateCountry)
  .delete(countryController.deleteCountry);

export default router;
