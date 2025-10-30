// calculate endDate based on billingCycle
let endDate = new Date();
if (data.billingCycle === "monthly") {
  endDate.setMonth(endDate.getMonth() + 1);   // adds 1 month
} else if (data.billingCycle === "yearly") {
  endDate.setFullYear(endDate.getFullYear() + 1); // adds 1 year
}

return endDate;