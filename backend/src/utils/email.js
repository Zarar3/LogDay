const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendVerificationEmail(to, code) {
  await resend.emails.send({
    from:    process.env.EMAIL_FROM || 'LogDay <onboarding@resend.dev>',
    to,
    subject: 'Your LogDay verification code',
    html:    `
      <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:36px;text-align:center;background:#f8fafc;border-radius:20px">
        <h1 style="color:#4F46E5;margin-bottom:6px">🔐 LogDay</h1>
        <p style="color:#64748b;font-size:16px;margin-bottom:28px">Enter this code in the app to verify your account:</p>
        <div style="background:#fff;border-radius:16px;padding:28px 20px;margin-bottom:24px;box-shadow:0 2px 12px rgba(0,0,0,0.07)">
          <span style="font-size:44px;font-weight:900;letter-spacing:12px;color:#4F46E5">${code}</span>
        </div>
        <p style="color:#94a3b8;font-size:13px">Expires in 15 minutes. If you didn't sign up for LogDay, ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail };
