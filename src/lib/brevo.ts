const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = "https://api.brevo.com/v3";

interface SendEmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  sender?: { name: string; email: string };
}

export async function sendEmail({
  to,
  subject,
  htmlContent,
  sender = { name: "SignalLeague", email: "noreply@signalleague.com" },
}: SendEmailParams) {
  if (!BREVO_API_KEY) {
    console.warn("[Brevo] No API key configured, skipping email send");
    return null;
  }

  const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sender, to, subject, htmlContent }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Brevo] Failed to send email:", error);
    throw new Error(`Failed to send email: ${response.status}`);
  }

  return response.json();
}

export async function addContactToList(email: string, listId: number) {
  if (!BREVO_API_KEY) {
    console.warn("[Brevo] No API key configured, skipping contact add");
    return null;
  }

  const response = await fetch(`${BREVO_API_URL}/contacts`, {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      listIds: [listId],
      updateEnabled: true,
    }),
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.text();
    console.error("[Brevo] Failed to add contact:", error);
  }

  return true;
}

export function generateWaitlistWelcomeEmail(
  referralCode: string,
  position: number
) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #0a0a0f; color: #e0e0e8; font-family: 'Courier New', monospace; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { font-size: 28px; font-weight: bold; color: #00ff88; text-transform: uppercase; letter-spacing: 0.1em; }
    .tagline { color: #6b6b80; font-size: 14px; margin-top: 8px; }
    .card { background: #0d0d14; border: 1px solid #1e1e32; padding: 32px; margin: 24px 0; }
    .position { text-align: center; }
    .position-number { font-size: 48px; font-weight: bold; color: #00ff88; }
    .position-label { color: #6b6b80; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; }
    .referral { background: #12121f; border: 1px solid #00ff88; padding: 16px; text-align: center; margin: 24px 0; }
    .referral-code { font-size: 20px; color: #00ff88; font-weight: bold; letter-spacing: 0.15em; }
    .referral-label { color: #6b6b80; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; }
    .cta { display: inline-block; background: #00ff88; color: #0a0a0f; padding: 12px 32px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; font-size: 14px; }
    .footer { text-align: center; color: #6b6b80; font-size: 12px; margin-top: 40px; }
    p { line-height: 1.6; color: #e0e0e8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SignalLeague</div>
      <div class="tagline">The Trustpilot for Trading Signals</div>
    </div>
    <div class="card">
      <p>You're on the list. Welcome to the future of signal group accountability.</p>
      <div class="position">
        <div class="position-label">Your Position</div>
        <div class="position-number">#${position}</div>
      </div>
    </div>
    <div class="referral">
      <div class="referral-label">Your Referral Code</div>
      <div class="referral-code">${referralCode}</div>
    </div>
    <p>Share your referral code to move up the waitlist. Each referral bumps you closer to early access.</p>
    <div class="footer">
      <p>&copy; SignalLeague. Unsubscribe by replying to this email.</p>
    </div>
  </div>
</body>
</html>`;
}
