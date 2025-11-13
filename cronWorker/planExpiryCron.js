import cron from "node-cron";
import dayjs from "dayjs";
import sequelize from "../config/db.js";
import { sendExpiryMail } from "../utlis/emailTemplate.js";

async function getExpiringPlans() {
  try {
   const [results] = await sequelize.query(`
  SELECT s.*, u.email AS "userEmail"
  FROM subscriptions s
  JOIN users u ON u.id = s."userId"
  WHERE s.status = 'active'
    AND s."endDate" >= CURRENT_DATE
    AND s."endDate" <= CURRENT_DATE + INTERVAL '3 days';
`);

    return results || [];
  } catch (err) {
    console.error("❌ Error fetching expiring plans:", err.message);
    return [];
  }
}

cron.schedule("45 15 * * *", async () => {
  console.log("🔍 Checking for plans with upcoming end dates...");

  try {
    const expiringPlans = await getExpiringPlans();
    if (!expiringPlans.length) {
      console.log("ℹ️ No active plans found nearing expiry today.");
      return;
    }

    for (const plan of expiringPlans) {
      // Ensure email field exists or adjust if joined with user table
      if (!plan.userEmail) {
        console.log(`⚠️ Skipping plan ${plan.id} - missing userEmail`);
        continue;
      }
      await sendExpiryMail({
        to: plan.userEmail,
        subject: "Your plan is about to expire",
        text: `Hi there, your ${plan.planName} plan will expire on ${dayjs(
          plan.endDate
        ).format("DD MMM YYYY")}. Please renew soon to avoid any interruption.`,
      });

      console.log(`📩 Reminder sent to ${plan.userEmail} (Plan: ${plan.planName})`);
    }

    console.log(`✅ Completed expiry check for ${expiringPlans.length} plans.`);
  } catch (error) {
    console.error("❌ Error running expiry cron:", error.message);
  }
});

export default getExpiringPlans;
