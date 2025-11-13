export const generateBusinessOwnerEmail = ({
  name,
  businessName,
  plan,
  planPrice,
  currency,
  email,
  phoneNumber,
  country,
  state,
  city,
  address,
  postalCode,
  loginUrl,
  invoiceUrl,
}) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome to DNB - Your Business Is Live</title>
    <style>
      body {
        background-color: #f5f7fa;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 0;
        color: #1f2937;
      }
      .wrapper {
        max-width: 600px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .header {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: #ffffff;
        text-align: center;
        padding: 40px 24px;
      }
      .logo {
        font-size: 28px;
        font-weight: 700;
        letter-spacing: 1px;
        margin-bottom: 8px;
      }
      .header h1 {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
        opacity: 0.95;
      }
      .content {
        padding: 32px 32px 24px;
      }
      .greeting {
        font-size: 18px;
        font-weight: 600;
        color: #111827;
        margin-bottom: 16px;
      }
      .content p {
        margin: 12px 0;
        line-height: 1.6;
        color: #4b5563;
        font-size: 15px;
      }
      .plan-details {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 20px;
        margin: 24px 0;
      }
      .plan-details h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: #111827;
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #e5e7eb;
      }
      .detail-row:last-child {
        border-bottom: none;
      }
      .detail-label {
        color: #6b7280;
        font-size: 14px;
      }
      .detail-value {
        color: #111827;
        font-weight: 500;
        font-size: 14px;
      }
      .account-info {
        background: #eff6ff;
        border-left: 4px solid #2563eb;
        padding: 16px 20px;
        margin: 24px 0;
        border-radius: 4px;
      }
      .account-info h4 {
        margin: 0 0 12px 0;
        font-size: 15px;
        font-weight: 600;
        color: #1e40af;
      }
      .account-info p {
        margin: 6px 0;
        font-size: 14px;
        color: #1e40af;
      }
      .button {
        display: inline-block;
        background: #2563eb;
        color: #ffffff !important;
        padding: 14px 32px;
        border-radius: 6px;
        text-decoration: none;
        margin: 24px 0 16px 0;
        font-weight: 600;
        font-size: 15px;
      }
      .button:hover {
        background: #1e40af;
      }
      .invoice-section {
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 16px 20px;
        margin: 24px 0;
        border-radius: 4px;
      }
      .invoice-section p {
        margin: 6px 0;
        color: #92400e;
      }
      .invoice-section strong {
        color: #78350f;
      }
      .invoice-section a {
        color: #d97706;
        text-decoration: none;
        font-weight: 600;
      }
      .invoice-section a:hover {
        text-decoration: underline;
      }
      .divider {
        border-top: 1px solid #e5e7eb;
        margin: 32px 0;
      }
      .footer {
        background: #f9fafb;
        font-size: 13px;
        text-align: center;
        color: #6b7280;
        padding: 24px 32px;
        line-height: 1.6;
      }
      .footer a {
        color: #2563eb;
        text-decoration: none;
      }
      .footer a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <!-- Header -->
      <div class="header">
        <div class="logo">DNB</div>
        <h1  class="text-white">Digital Negotiation Book</h1>
      </div>

      <!-- Main content -->
      <div class="content">
        <div class="greeting">Hi ${name || "there"},</div>
        
        <p>
          Welcome to DNB! We're excited to have <strong>${businessName}</strong> on board.
        </p>
        
        <p>
          Your business account has been successfully created and is now active. You can start 
          managing your buyers, tracking performance, and growing your business right away.
        </p>

        <!-- Plan Details -->
        <div class="plan-details">
          <h3>Subscription Details</h3>
          <div class="detail-row">
            <span class="detail-label">Plan</span>
            <span class="detail-value">${plan}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Price</span>
            <span class="detail-value">${currency} ${planPrice}/month</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Business Name</span>
            <span class="detail-value">${businessName}</span>
          </div>
        </div>

        <!-- Account Information -->
        <div class="account-info">
          <h4>Your Account Information</h4>
          <p><strong>Email:</strong> ${email}</p>
          ${phoneNumber ? `<p><strong>Phone:</strong> ${phoneNumber}</p>` : ""}
          ${address ? `<p><strong>Address:</strong> ${address}${city ? `, ${city}` : ""}${state ? `, ${state}` : ""}${postalCode ? ` ${postalCode}` : ""}${country ? `, ${country}` : ""}</p>` : ""}
        </div>

        <a href="${loginUrl}" class="button">Access Your Dashboard</a>

        ${
          invoiceUrl
            ? `<div class="invoice-section">
                <p><strong>📄 Invoice Ready</strong></p>
                <p>Your invoice is available for download:</p>
                <p><a href="${invoiceUrl}" target="_blank">Download Invoice →</a></p>
              </div>`
            : ""
        }

        <div class="divider"></div>

        <p>
          <strong>What's Next?</strong>
        </p>
        <p>
          Log in to your dashboard to complete your profile, add your first buyers, 
          and explore all the features available in your ${plan} plan.
        </p>
        
        <p>
          If you have any questions or need assistance, our support team is here to help. 
          Visit our <a href="${process.env.HELP_CENTER_URL || "#"}">Help Center</a> or 
          contact us at <a href="mailto:${process.env.SUPPORT_EMAIL || "support@dnb.com"}">${process.env.SUPPORT_EMAIL || "support@dnb.com"}</a>.
        </p>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>
          This email was sent to ${email} because a business account was created.<br />
          If you didn't register for this account, please contact our support team immediately.
        </p>
        <p style="margin-top: 16px;">
          &copy; ${new Date().getFullYear()} Digital Negotiation Book. All rights reserved.
        </p>
      </div>
    </div>
  </body>
</html>
`;