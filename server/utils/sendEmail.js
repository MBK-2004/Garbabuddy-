const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD?.replace(/\s+/g, ''),
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 30000,
});

async function sendEmail({ to, subject, text, html }) {
 try {
  await transporter.verify();
  console.log('SMTP connection verified successfully');
} catch (error) {
  console.error('SMTP verification failed:', {
    code: error.code,
    command: error.command,
    message: error.message,
  });
  throw error;
}

  return transporter.sendMail({
    from: `"Garba Buddy" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

module.exports = sendEmail;