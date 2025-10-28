export const generateBusinessOwnerEmail = ({
  name,
  businessName,
  loginUrl,
  invoiceUrl,
}) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your Business Is Now Live | DNB</title>
    <style>
      body {
        background-color: #f5f7fa;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 0;
        color: #1f2937;
      }
      .wrapper {
        max-width: 640px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      }
      .header {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: #ffffff;
        text-align: center;
        padding: 36px 20px 28px;
      }
      .logo {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: 0.5px;
      }
      .header h1 {
        margin: 12px 0 0;
        font-size: 22px;
        font-weight: 600;
      }
      .content {
        padding: 40px 32px 20px;
      }
      .content h2 {
        font-size: 18px;
        margin-bottom: 12px;
        color: #111827;
      }
      .content p {
        margin: 10px 0;
        line-height: 1.65;
        color: #374151;
        font-size: 15px;
      }
      .button {
        display: inline-block;
        background: #2563eb;
        color: #ffffff !important;
        padding: 12px 28px;
        border-radius: 8px;
        text-decoration: none;
        margin-top: 24px;
        font-weight: 600;
        font-size: 15px;
        transition: all 0.2s ease-in-out;
      }
      .button:hover {
        background: #1e40af;
      }
      .invoice-box {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-left: 4px solid #2563eb;
        padding: 16px 18px;
        margin-top: 32px;
        border-radius: 8px;
      }
      .invoice-box a {
        color: #2563eb;
        text-decoration: none;
        font-weight: 500;
      }
      .invoice-box p {
        margin: 6px 0;
      }
      .divider {
        border-top: 1px solid #e5e7eb;
        margin: 40px 0 28px;
      }
      .footer {
        font-size: 13px;
        text-align: center;
        color: #9ca3af;
        padding: 16px 30px 30px;
        line-height: 1.6;
      }
      .footer a {
        color: #2563eb;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <!-- Header -->
      <div class="header">
        <div class="logo">DNB</div>
        <h1>Welcome to the Digital Negotiation Book</h1>
      </div>

      <!-- Main content -->
      <div class="content">
        <h2>Hi ${name || "there"},</h2>
        <p>
          We're thrilled to have <strong>${businessName}</strong> join our business network.
        </p>
        <p>
          Your business account is now live! From your dashboard, you can manage buyers,
          track performance, and expand your digital presence — all in one place.
        </p>

        <a href="${loginUrl}" class="button">Go to Dashboard</a>

        ${
          invoiceUrl
            ? `<div class="invoice-box">
                <p><strong>📄 Your Invoice is Ready</strong></p>
                <p>You can view or download your invoice from the link below:</p>
                <p><a href="${invoiceUrl}" target="_blank">View Invoice</a></p>
              </div>`
            : ""
        }

        <div class="divider"></div>

        <p>
          Need help getting started? Visit our <a href="${process.env.HELP_CENTER_URL || "#"}" target="_blank">Help Center</a> or reach out to
          our <a href="mailto:${process.env.SUPPORT_EMAIL || "support@dnb.com"}">support team</a>.
        </p>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>
          If you didn’t request this registration, you can safely ignore this email.<br />
          &copy; ${new Date().getFullYear()} DNB. All rights reserved.
        </p>
      </div>
    </div>
  </body>
</html>
`;
