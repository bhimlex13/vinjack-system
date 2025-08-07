// server/utils/emailService.js
const nodemailer = require('nodemailer');

// Set up the transporter using your .env variables
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

/**
 * Sends a low stock summary email.
 * @param {Array} lowStockItems - An array of products that are low on stock.
 */
const sendLowStockEmail = async (lowStockItems, recipientEmail) => {
  if (!lowStockItems || lowStockItems.length === 0) {
    console.log('No low stock items to report. Email not sent.');
    return;
  }

  // Create an HTML list of the low stock items
  const itemsHtml = lowStockItems
    .map(item => `<li>${item.name} (Current: ${item.quantity}, Reorder at: ${item.reorderLevel})</li>`)
    .join('');

  const mailOptions = {
    from: `"VinJack System Alert" <${process.env.EMAIL_USER}>`,
    to: recipientEmail, // <-- Use the recipient's email
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

module.exports = { sendLowStockEmail };