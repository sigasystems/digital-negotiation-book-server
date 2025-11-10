import { supabase } from "../config/supabaseClient.js";
import { addMonths } from "date-fns";

// create or update usage log on plan purchase
export const initUsageLog = async (businessOwnerId, planKey) => {
  const resetDate = addMonths(new Date(), 1);

  const { data, error } = await supabase
    .from("usage_logs")
    .upsert([
      {
        business_owner_id: businessOwnerId,
        plan_key: planKey,
        usage_users: 0,
        usage_products: 0,
        usage_offers: 0,
        usage_buyers: 0,
        reset_date: resetDate,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// increment usage counts safely
export const incrementUsage = async (businessOwnerId, type) => {
  const column = `usage_${type}`;
  const { data: usage, error } = await supabase
    .from("usage_logs")
    .select("*")
    .eq("business_owner_id", businessOwnerId)
    .single();

  if (error || !usage) throw new Error("Usage log not found.");

  const plan = await getPlanByKey(usage.plan_key);
  const limit = plan[`max${type.charAt(0).toUpperCase() + type.slice(1)}`];

  if (usage[column] >= limit) {
    throw new Error(`Limit reached for ${type}`);
  }

  const { error: updateError } = await supabase
    .from("usage_logs")
    .update({ [column]: usage[column] + 1, updated_at: new Date() })
    .eq("business_owner_id", businessOwnerId);

  if (updateError) throw updateError;
};

// reset expired usage
export const resetExpiredUsages = async () => {
  const today = new Date();
  const { data: expired } = await supabase
    .from("usage_logs")
    .select("*")
    .lte("reset_date", today.toISOString());

  if (!expired?.length) return 0;

  for (const log of expired) {
    const nextReset = addMonths(new Date(), 1);
    await supabase
      .from("usage_logs")
      .update({
        usage_users: 0,
        usage_products: 0,
        usage_offers: 0,
        usage_buyers: 0,
        reset_date: nextReset,
        updated_at: new Date(),
      })
      .eq("id", log.id);
  }

  return expired.length;
};

//still we don't use this function
//later we need to use this function