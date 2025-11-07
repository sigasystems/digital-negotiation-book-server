import cron from "node-cron";
import dayjs from "dayjs";
import sequelize from "../config/db.js";
import { sendExpiryMail } from "../utlis/emailTemplate.js";

// 🧠 Helper: Fetch plans expiring within 3 days
async function getExpiringPlans() {
  const now = dayjs().toDate();
  const in3Days = dayjs().add(3, "day").toDate();

  const [results] = await sequelize.query(
    `SELECT * FROM subscriptions 
     WHERE "endDate" BETWEEN :now AND :in3Days 
       AND status = 'active'`,
    {
      replacements: { now, in3Days },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  return results || [];
}

// 🚀 Cron job — runs daily at midnight
cron.schedule("0 10 * * *", async () => {
  console.log("🔍 Checking for expiring plans...");

  try {
    const expiringPlans = await getExpiringPlans();

    for (const plan of expiringPlans) {
      await sendExpiryMail({
        to: plan.userEmail, // ensure this column exists or join users table
        subject: "Your plan is about to expire",
        text: `Hi there, your ${plan.planName} plan will expire on ${dayjs(
          plan.endDate
        ).format("DD MMM YYYY")}. Please renew to continue uninterrupted service.`,
      });

      console.log(`📩 Reminder sent to user ${plan.userId}`);
    }

    console.log(`✅ Completed check for ${expiringPlans.length} expiring plans.`);
  } catch (error) {
    console.error("❌ Error running expiry cron:", error.message);
  }
});

export default getExpiringPlans;
