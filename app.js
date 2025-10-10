import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
// import { planRoutes,  paymentRoutes,  businessOwnersRoutes, boBuyersRoutes, offerDraftRoutes, boOfferRoutes, offerActionsRoutes } from "./routes/index.js"
// import productRoutes from "./routes/productRoutes/product.routes.js"
import {locationRoutes, authRoutes ,superadminRoutes ,businessOwnerRoutes ,productRoutes, offerDraftRoute, offerRoute,planRoutes , paymentRoutes} from "./routes/index.js";
import { notFoundHandler, errorHandler } from "./handlers/index.js";
import cookieParser from "cookie-parser";

dotenv.config();
const app = express();

// -------------------------
// Middleware
// -------------------------
// app.use(cors());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://digital-negotiation-book-client.vercel.app"
    ],
    credentials: true,
  })
);
app.use(helmet())
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// -------------------------
// Routes
// -------------------------
app.use("/api/auth",authRoutes)
app.use("/api/plans", planRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/business-owner",businessOwnerRoutes)
app.use("/api/offer-draft", offerDraftRoute)
app.use("/api/product",productRoutes)
app.use("/api/location",locationRoutes)
app.use("/api/offer",offerRoute)



app.use(notFoundHandler);
app.use(errorHandler);

export default app;
