require('dotenv').config({path: '../.env'});

const sendEmail = require('./sendEmail');

async function testEmail() {
  try {
    const result = await sendEmail({
      to: process.env.EMAIL_USER,
      subject: 'Garba Buddy Email Test',
      text: 'Success! Garba Buddy can send emails.',
      html: '<h2>insaan</h2><p>Yo ur Verified!</p>',
    });

    console.log('Email sent successfully!');
    console.log('Message ID:', result.messageId);
  } catch (error) {
    console.error('Email test failed:', error.message);
  }
}

testEmail();