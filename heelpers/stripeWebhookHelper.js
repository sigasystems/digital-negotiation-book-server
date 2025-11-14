// helpers for Stripe webhook
async function handleSubscriptionCreated(session) {
  const { userId, planId } = session.metadata;
  const subscriptionId = session.subscription;

  await Use.create({
    userId,
    planId,
    subscriptionId: subscriptionId,
    startDate: new Date(),
    expiryDate: new Date(session.expires_at * 1000),
    status: "active",
  });
}

async function handleRenewal(invoice) {
  const subscriptionId = invoice.subscription;
  // example: extend expiry or log renewal
  await UserPlan.update(
    {
      expiryDate: new Date(invoice.lines.data[0].period.end * 1000),
      status: "active",
    },
    { where: { subscriptionId: subscriptionId } }
  );
}

async function handleSubscriptionCanceled(subscription) {
  const subscriptionId = subscription.id;
  await UserPlan.update(
    { status: "canceled" },
    { where: { subscriptionId: subscriptionId } }
  );
}

module.exports = {
  handleSubscriptionCreated,
  handleRenewal,
  handleSubscriptionCanceled,
};