// server/utils/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

/**
 * Sends a profile update verification code email.
 * @param {string} recipientEmail - The email address to send the code to.
 * @param {string} code - The verification code.
 */
const sendVerificationEmail = async (recipientEmail, code) => {
  const mailOptions = {
    from: `"VinJack System" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: 'Your Profile Update Verification Code',
    html: `
      <h1>Verification Required</h1>
      <p>Please use the following code to confirm your profile update. This code will expire in 5 minutes.</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${code}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent successfully to ${recipientEmail}.`);
  } catch (error) {
    console.error(`Error sending verification email to ${recipientEmail}:`, error);
    throw new Error('Failed to send verification email.');
  }
};


/**
 * Sends a low stock summary email.
 * @param {Array} lowStockItems - An array of products that are low on stock.
 */
const sendLowStockEmail = async (lowStockItems, recipientEmail) => {
  if (!lowStockItems || lowStockItems.length === 0) {
    console.log('No low stock items to report. Email not sent.');
    return;
  }

  const itemsHtml = lowStockItems
    .map(item => `<li>${item.name} (Current: ${item.quantity}, Reorder at: ${item.reorderLevel})</li>`)
    .join('');

  const mailOptions = {
    from: `"VinJack System Alert" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `Low Stock Alert - ${lowStockItems.length} Items Need Restocking`,
    html: `
      <h1>Inventory Alert</h1>
      <p>The following items are at or below their reorder level:</p>
      <ul>${itemsHtml}</ul>
      <p>Please reorder these items soon.</p>
    `,
  };  

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Low stock alert email sent successfully to ${recipientEmail}.`);
  } catch (error) {
    console.error(`Error sending email to ${recipientEmail}:`, error);
  }
};

module.exports = { sendLowStockEmail, sendVerificationEmail };