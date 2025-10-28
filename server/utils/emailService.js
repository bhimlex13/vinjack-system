// server/utils/emailService.js
const nodemailer = require('nodemailer');

// Ensure EMAIL_USER and EMAIL_APP_PASSWORD are set in your .env file
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

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


const sendLowStockEmail = async (lowStockItems, recipientEmail) => {
  if (!lowStockItems || lowStockItems.length === 0) {
    console.log('No low stock items to report. Email not sent.');
    return;
  }

  // Generate HTML list of low stock items
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
    console.error(`Error sending low stock email to ${recipientEmail}:`, error);
    // Log error, but don't stop the calling process
  }
};


const sendPoLink = async (supplierEmail, supplierName, poNumber, token) => {
  // Construct the link using the client URL from environment variables
  const link = `${process.env.CLIENT_URL}/supplier/po/${token}`; // Ensure CLIENT_URL is in your .env

  const mailOptions = {
    from: `"Vinjack System" <${process.env.EMAIL_USER}>`,
    to: supplierEmail,
    subject: `New Purchase Order from Vinjack Sales: ${poNumber}`,
    html: `
      <p>Hello ${supplierName},</p>
      <p>You have received a new Purchase Order (${poNumber}) from Vinjack Sales and Inventory Management System.</p>
      <p>Please review the order, update item availability and costs, and submit your response by clicking the link below:</p>
      <p>
        <a
          href="${link}"
          style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;"
        >
          View Purchase Order
        </a>
      </p>
      <p>If you cannot click the link, please copy and paste this URL into your browser:</p>
      <p>${link}</p>
      <p>Thank you,</p>
      <p>Vinjack Sales and Inventory Management System</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`PO email sent successfully to ${supplierEmail}`);
  } catch (error) {
    console.error(`Error sending PO link email to ${supplierEmail}:`, error);
    // Log the error but don't stop PO creation
  }
};

// --- NEW FUNCTION: Send PO Approval Notification ---
const sendPOApprovalNotification = async (recipientEmail, supplierName, poNumber) => {
    const mailOptions = {
        from: `"VinJack System" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: `Purchase Order ${poNumber} Approved by VinJack Motorworks`,
        html: `
            <p>Hello ${supplierName},</p>
            <p>This email confirms that your submitted review for Purchase Order <strong>${poNumber}</strong> has been <strong>approved</strong> by VinJack Motorworks.</p>
            <p>We will proceed with the order based on the agreed quantities and costs.</p>
            <p>Thank you for your prompt response.</p>
            <p>Sincerely,</p>
            <p>VinJack Motorworks</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`PO Approval notification sent successfully to ${recipientEmail} for PO ${poNumber}`);
    } catch (error) {
        console.error(`Error sending PO Approval email to ${recipientEmail} for PO ${poNumber}:`, error);
        // Log the error but don't necessarily stop the main process
        // Consider adding more robust error logging if needed
    }
};
// --- END NEW FUNCTION ---


module.exports = {
    sendLowStockEmail,
    sendVerificationEmail,
    sendPoLink,
    sendPOApprovalNotification // --- EXPORT NEW FUNCTION ---
};