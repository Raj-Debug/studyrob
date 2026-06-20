// Sends a notification email to you (the admin) whenever a user finishes a
// study session, using the Resend API directly via fetch (no extra SDK needed).
// Docs: https://resend.com/docs/api-reference/emails/send-email

const RESEND_URL = 'https://api.resend.com/emails';

async function sendSessionCompleteEmail({ username, hoursCompleted, robuxEarned, totalRobuxEarned }) {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

  if (!apiKey || !adminEmail) {
    console.warn('RESEND_API_KEY or ADMIN_EMAIL not set — skipping email send.');
    return { skipped: true };
  }

  const subject = `${username} just finished a ${hoursCompleted}-hour study session`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px;">
      <h2>Session complete 📚</h2>
      <p><strong>${username}</strong> finished a <strong>${hoursCompleted}-hour</strong> study session.</p>
      <p>Robux earned this session: <strong>${robuxEarned}</strong></p>
      <p>Their running total owed: <strong>${totalRobuxEarned}</strong> Robux</p>
      <p>Remember to pay them by purchasing their Game Pass for the amount owed.</p>
    </div>
  `;

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: adminEmail,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Resend email failed:', res.status, errText);
    return { skipped: false, ok: false, error: errText };
  }

  return { skipped: false, ok: true };
}

module.exports = { sendSessionCompleteEmail };
