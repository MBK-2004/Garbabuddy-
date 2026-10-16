
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, text, html }) {
  const { data, error } = await resend.emails.send({
    from: 'GarbaBuddy <onboarding@resend.dev>',
    to: [to],
    subject,
    text,
    html,
  });

  if (error) {
    console.error('Resend email error:', error);
    throw new Error('Email delivery request failed');
  }

  console.log('Resend accepted email:', data.id);
  return data;
}

module.exports = sendEmail;
