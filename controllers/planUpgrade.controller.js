import { asyncHandler } from "../handlers/asyncHandler.js";
import { successResponse, errorResponse } from "../handlers/responseHandler.js";
import stripe from "../config/stripe.js";
import User from "../models/user.model.js";
import Plan from "../models/plan.model.js";
import { Payment } from "../models/index.js";
import Subscription from "../models/subscription.model.js";

/**
 * Get user's payment history
 */
export const getPaymentHistory = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;


    // Get all payments for user (check both userId and businessOwnerId)
    const { Op } = Payment.sequelize.Sequelize;
    const payments = await Payment.findAll({
      where: {
        [Op.or]: [
          { userId },
          { businessOwnerId: userId }
        ]
      },
      include: [
        {
          model: Plan,
          attributes: ["id", "name", "priceMonthly", "priceYearly"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });


    // Get all subscriptions for user
    const subscriptions = await Subscription.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });


    // Format payment history
    const history = payments.map((payment) => ({
      id: payment.id,
      planName: payment.Plan?.name || "Unknown Plan",
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      subscriptionId: payment.subscriptionId,
      invoicePdf: payment.invoicePdf,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      type: payment.invoicePdf ? "renewal" : "initial",
    }));

    const totalSpent = payments
      .filter((p) => p.status === "success")
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);


    return successResponse(res, 200, "Payment history retrieved successfully", {
      payments: history,
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        subscriptionId: sub.subscriptionId,
        planName: sub.planName,
        status: sub.status,
        paymentStatus: sub.paymentStatus,
        startDate: sub.startDate,
        endDate: sub.endDate,
        maxUsers: sub.maxUsers,
        maxProducts: sub.maxProducts,
        maxOffers: sub.maxOffers,
        maxBuyers: sub.maxBuyers,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      })),
      totalPayments: payments.length,
      totalSpent,
    });
  } catch (error) {
    console.error("❌ Error fetching payment history:", error);
    return errorResponse(res, 500, "Failed to fetch payment history");
  }
});

/**
 * Get current active subscription
 */
export const getCurrentSubscription = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;


    // Get any subscription (don't filter by status)
    let subscription = await Subscription.findOne({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });


    // If no subscription, try to create from payment
    if (!subscription) {
      
      const payment = await Payment.findOne({
        where: {
          userId,
          status: 'success',
          subscriptionId: { [Subscription.sequelize.Sequelize.Op.ne]: null }
        },
        order: [["createdAt", "DESC"]],
      });

      if (payment && payment.subscriptionId) {
        
        const plan = await Plan.findByPk(payment.planId);
        
        if (plan) {
          subscription = await Subscription.create({
            userId: payment.userId,
            subscriptionId: payment.subscriptionId,
            planName: plan.name,
            status: 'active',
            paymentStatus: 'paid',
            startDate: payment.createdAt,
            endDate: new Date(payment.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000),
            maxLocations: plan.maxLocations || 0,
            maxProducts: plan.maxProducts || 0,
            maxOffers: plan.maxOffers || 0,
            maxBuyers: plan.maxBuyers || 0,
          });
          
        }
      }
    }

    if (!subscription) {
      return successResponse(res, 200, "No subscription found", {
        subscription: null,
      });
    }

    // Fix status if needed
    if (!['active', 'trialing'].includes(subscription.status)) {
      await subscription.update({
        status: 'active',
        paymentStatus: 'paid',
      });
    }

    // Get plan details
    const plan = await Plan.findOne({
      where: { name: subscription.planName },
    });

    return successResponse(res, 200, "Current subscription retrieved", {
      subscription: {
        ...subscription.toJSON(),
        plan,
      },
    });
  } catch (error) {
    console.error("Error fetching current subscription:", error);
    return errorResponse(res, 500, "Failed to fetch current subscription");
  }
});

/**
 * Upgrade/Downgrade plan
 */
export const upgradePlan = asyncHandler(async (req, res) => {
  try {
    const { userId, planId, billingCycle } = req.body;

   

    // 1. Get user
    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, 404, "User not found");
    }

    // 2. Get new plan
    const newPlan = await Plan.findByPk(planId);
    if (!newPlan) {
      return errorResponse(res, 404, "Plan not found");
    }

    // 3. Get current subscription (any status)
    let currentSubscription = await Subscription.findOne({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });


    // If no subscription found, try to create from payment
    if (!currentSubscription) {
      
      // Find successful payment with subscriptionId
      const payment = await Payment.findOne({
        where: {
          userId,
          status: 'success',
          subscriptionId: { [Subscription.sequelize.Sequelize.Op.ne]: null }
        },
        order: [["createdAt", "DESC"]],
      });

      if (payment && payment.subscriptionId) {
        
        // Get plan details
        const plan = await Plan.findByPk(payment.planId);
        
        if (plan) {
          
          // Create subscription
          currentSubscription = await Subscription.create({
            userId: payment.userId,
            subscriptionId: payment.subscriptionId,
            planName: plan.name,
            status: 'active',
            paymentStatus: 'paid',
            startDate: payment.createdAt,
            endDate: new Date(payment.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
            maxLocations: plan.maxLocations || 0,
            maxProducts: plan.maxProducts || 0,
            maxOffers: plan.maxOffers || 0,
            maxBuyers: plan.maxBuyers || 0,
          });
          
        }
      }
    }

    // If still no subscription, return error
    if (!currentSubscription) {
      console.error("❌ No subscription or payment found for user:", userId);
      return errorResponse(
        res,
        400,
        "No subscription found. Please create a new subscription."
      );
    }

    // If subscription exists but status is not active/trialing, fix it
    if (!['active', 'trialing'].includes(currentSubscription.status)) {
     
      
      await currentSubscription.update({
        status: 'active',
        paymentStatus: 'paid',
      });
     
    }


    // Determine new price
    const newPrice =
      billingCycle === "yearly" ? newPlan.priceYearly : newPlan.priceMonthly;
    const stripeInterval = billingCycle === "monthly" ? "month" : "year";

    // Check if this is a manual/trial subscription (not from Stripe)
    const isManualSubscription = 
      !currentSubscription.subscriptionId || 
      currentSubscription.subscriptionId.startsWith('manual_') ||
      currentSubscription.subscriptionId.startsWith('TRIAL-');

    if (isManualSubscription) {

      // For manual subscriptions, create a new Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: user.email,
        line_items: [
          {
            price_data: {
              currency: newPlan.currency?.toLowerCase() || "inr",
              product_data: { name: newPlan.name },
              unit_amount: Math.round(Number(newPrice) * 100),
              recurring: { interval: stripeInterval },
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: user.id,
          planId: newPlan.id,
          billingCycle,
          isUpgrade: "true",
        },
        success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/cancel`,
      });


      // Cancel old manual subscription
      await currentSubscription.update({
        status: "canceled",
        paymentStatus: "unpaid",
      });

      // Create pending payment record
      await Payment.create({
        userId: user.id,
        planId: newPlan.id,
        amount: Number(newPrice),
        status: "pending",
        transactionId: session.id,
        subscriptionId: null,
      });

      return successResponse(res, 200, "Please complete payment to upgrade", {
        checkoutUrl: session.url,
        sessionId: session.id,
        newPlan: {
          id: newPlan.id,
          name: newPlan.name,
          price: newPrice,
          billingCycle,
        },
        message: "Redirecting to payment page...",
      });
    }

    // 4. Get Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(
      currentSubscription.subscriptionId
    );


    // 5. Create new price in Stripe
    const priceData = await stripe.prices.create({
      currency: newPlan.currency?.toLowerCase() || "inr",
      unit_amount: Math.round(Number(newPrice) * 100),
      recurring: { interval: stripeInterval },
      product_data: {
        name: newPlan.name,
      },
    });


    // 6. Update Stripe subscription
    const updatedStripeSubscription = await stripe.subscriptions.update(
      currentSubscription.subscriptionId,
      {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: priceData.id,
          },
        ],
        proration_behavior: "create_prorations",
        metadata: {
          userId: user.id,
          planId: newPlan.id,
          billingCycle,
          upgradedAt: new Date().toISOString(),
        },
      }
    );


    // 7. Update subscription in database
    await currentSubscription.update({
      planName: newPlan.name,
      status: updatedStripeSubscription.status,
      endDate: new Date(updatedStripeSubscription.current_period_end * 1000),
      maxUsers: newPlan.maxUsers || 0,
      maxProducts: newPlan.maxProducts || 0,
      maxOffers: newPlan.maxOffers || 0,
      maxBuyers: newPlan.maxBuyers || 0,
    });


    // 8. Create payment record for upgrade
    const prorationAmount =
      updatedStripeSubscription.latest_invoice?.amount_due || 0;

    if (prorationAmount > 0) {
      await Payment.create({
        userId: user.id,
        planId: newPlan.id,
        amount: prorationAmount / 100,
        currency: newPlan.currency || "INR",
        status: "success",
        paymentMethod: "card",
        transactionId: `upgrade_${Date.now()}`,
        subscriptionId: currentSubscription.subscriptionId,
      });

    }

    return successResponse(res, 200, "Plan upgraded successfully", {
      subscription: currentSubscription,
      newPlan: {
        id: newPlan.id,
        name: newPlan.name,
        price: newPrice,
        billingCycle,
      },
      prorationAmount: prorationAmount / 100,
      nextBillingDate: new Date(
        updatedStripeSubscription.current_period_end * 1000
      ),
    });
  } catch (error) {
    console.error("❌ Error upgrading plan:", error);
    return errorResponse(res, 500, error.message || "Failed to upgrade plan");
  }
});

/**
 * Cancel subscription
 */
export const cancelSubscription = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.body;


    // Get current active subscription
    const subscription = await Subscription.findOne({
      where: {
        userId,
        status: ["active", "trialing"],
      },
      order: [["createdAt", "DESC"]],
    });

    if (!subscription) {
      return errorResponse(res, 404, "No active subscription found");
    }

    // Check if manual subscription
    const isManualSubscription = 
      !subscription.subscriptionId || 
      subscription.subscriptionId.startsWith('manual_') ||
      subscription.subscriptionId.startsWith('TRIAL-');

    if (isManualSubscription) {
      // Just update database for manual subscriptions
      await subscription.update({
        status: "canceled",
        paymentStatus: "unpaid",
      });

      return successResponse(res, 200, "Subscription canceled successfully", {
        subscription,
        canceledAt: new Date(),
      });
    }

    // Cancel in Stripe
    const canceledSubscription = await stripe.subscriptions.cancel(
      subscription.subscriptionId
    );


    // Update in database
    await subscription.update({
      status: "canceled",
      paymentStatus: "unpaid",
    });


    return successResponse(res, 200, "Subscription canceled successfully", {
      subscription,
      canceledAt: new Date(canceledSubscription.canceled_at * 1000),
      accessUntil: new Date(canceledSubscription.current_period_end * 1000),
    });
  } catch (error) {
    console.error("❌ Error canceling subscription:", error);
    return errorResponse(
      res,
      500,
      error.message || "Failed to cancel subscription"
    );
  }
});

/**
 * Reactivate canceled subscription
 */
export const reactivateSubscription = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.body;


    // Get canceled subscription
    const subscription = await Subscription.findOne({
      where: {
        userId,
        status: "canceled",
      },
      order: [["createdAt", "DESC"]],
    });

    if (!subscription) {
      return errorResponse(res, 404, "No canceled subscription found");
    }

    // Check if manual subscription
    const isManualSubscription = 
      !subscription.subscriptionId || 
      subscription.subscriptionId.startsWith('manual_') ||
      subscription.subscriptionId.startsWith('TRIAL-');

    if (isManualSubscription) {
      return errorResponse(
        res,
        400,
        "Cannot reactivate manual subscription. Please create a new subscription."
      );
    }

    // Reactivate in Stripe
    const reactivatedSubscription = await stripe.subscriptions.update(
      subscription.subscriptionId,
      {
        cancel_at_period_end: false,
      }
    );

    // Update in database
    await subscription.update({
      status: reactivatedSubscription.status,
      paymentStatus: "paid",
    });

    return successResponse(
      res,
      200,
      "Subscription reactivated successfully",
      {
        subscription,
        nextBillingDate: new Date(
          reactivatedSubscription.current_period_end * 1000
        ),
      }
    );
  } catch (error) {
    console.error("❌ Error reactivating subscription:", error);
    return errorResponse(
      res,
      500,
      error.message || "Failed to reactivate subscription"
    );
  }
});

export default {
  getPaymentHistory,
  getCurrentSubscription,
  upgradePlan,
  cancelSubscription,
  reactivateSubscription,
};
