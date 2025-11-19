import transporter from "../config/nodemailer.js";
import dayjs from "dayjs";
export const generateEmailTemplate = ({ title, subTitle, body, footer }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #f4f4f4;
          padding: 20px;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: auto;
          background: #fff;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h2 {
          color: #2c3e50;
          margin-bottom: 10px;
        }
        p {
          line-height: 1.6;
        }
        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>${title}</h2>
        <p><b>${subTitle}</b></p>
        <div>${body}</div>
        ${
          footer
            ? `<div class="footer">
                <p>${footer}</p>
              </div>`
            : ""
        }
      </div>
    </body>
    </html>
  `;
};

export const sendEmailWithRetry = async (transporter, mailOptions, maxAttempts = 2) => {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await transporter.sendMail(mailOptions);
      return { success: true };
    } catch (err) {
      lastError = err;
      console.error(`Attempt ${attempt} - Failed to send email:`, err.message);

      // Optional: wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return {
    success: false,
    error: lastError,
  };
};

export const emailLoginButton = ({ url, label }) => `
  <a 
    href="${url}" 
    style="
      display:inline-block;
      padding:10px 18px;
      margin-top:8px;
      background-color:#4f46e5;
      color:#ffffff;
      text-decoration:none;
      border-radius:6px;
      font-weight:600;
    "
  >
    ${label}
  </a>
`;

// ✅ Send expiry reminder email
export const sendExpiryMail = async ({
  to,
  planName,
  endDate,
  businessName,
  subject,
  text,
  html,
}) => {
  try {
    const formattedDate = dayjs(endDate).format("DD MMM YYYY");

    const mailOptions = {
      from: `"DNB Support" <${process.env.EMAIL_USER}>`,
      to,
      subject: subject || `Your DNB ${planName || "Subscription"} Plan is Expiring Soon ⏰`,
      text:
        text ||
        `Hello${businessName ? " " + businessName : ""},

Your current DNB ${planName || "subscription"} plan will expire on ${formattedDate}.
Please renew to continue uninterrupted access to your DNB dashboard, tools, and business insights.

Renew here: https://dnb-app.com/pricing

— Team DNB`,
      html:
        html ||
        `
        <div style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f7f9fc; padding: 40px 0;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
            
            <!-- Header -->
            <div style="background: linear-gradient(90deg, #2563eb, #4f46e5); padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 22px; margin: 0;">DNB</h1>
            </div>
            
            <!-- Body -->
            <div style="padding: 32px;">
              <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px;">Your Plan is Expiring Soon ⏰</h2>
              <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">
                Hello${businessName ? " <b>" + businessName + "</b>" : ""},
              </p>
              <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">
                This is a friendly reminder that your <b>${planName || "DNB subscription"}</b> plan will expire on 
                <b>${formattedDate}</b>.
              </p>
              <p style="color: #374151; font-size: 15px; margin-bottom: 24px;">
                To continue enjoying uninterrupted access to your dashboard, tools, and analytics, please renew your plan before it expires.
              </p>
              
              <!-- Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="https://dnb.sigasystems.com/upgrade-plan" 
                  style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 15px; font-weight: 500;
                         text-decoration: none; padding: 12px 24px; border-radius: 8px;">
                  Renew My Plan
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              
              <p style="color: #6b7280; font-size: 13px; text-align: center;">
                If you've already renewed your plan, please disregard this message.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
              <p style="margin: 0;">© ${new Date().getFullYear()} DNB. All rights reserved.</p>
              <p style="margin: 4px 0 0;">Need help? 
                <a href="mailto:support@dnb-app.com" style="color: #2563eb; text-decoration: none;">Contact Support</a>
              </p>
            </div>
          </div>
        </div>
        `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📩 Expiry reminder sent to ${to}: ${info.response}`);
    return info;
  } catch (error) {
    console.error("❌ Mail send error:", error);
    throw error;
  }
};
