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
  // ... (existing function, no changes)
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
  // ... (existing function, no changes)
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
  // ... (existing function, no changes)
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

const sendPOApprovalNotification = async (recipientEmail, supplierName, poNumber) => {
    // ... (existing function, no changes)
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
    }
};

// --- NEW FUNCTION: Send Daily Sales Report ---
const sendDailySalesReport = async ({ reportData, recipientEmail, reportDateStr }) => {
  const { totalRevenue, totalProfit, totalSales, totalItemsSold, topSellingProducts } = reportData;

  // Format top selling products into an HTML table
  const productsHtml = topSellingProducts.length > 0
    ? topSellingProducts.map(item => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.productInfo?.name || 'N/A'}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.totalQuantitySold}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="2" style="border: 1px solid #ddd; padding: 8px; text-align: center;">No products sold today.</td></tr>';

  const mailOptions = {
    from: `"VinJack System Report" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `Daily Sales Report for ${reportDateStr}`,
    html: `
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px;">
        <h1 style="color: #333;">Daily Sales Report</h1>
        <p>Here is the sales summary for ${reportDateStr}:</p>
        
        <table style="width: 100%; max-width: 400px; border-collapse: collapse; margin-bottom: 20px; font-size: 16px;">
          <tr style="background-color: #f4f4f4;">
            <td style="border: 1px solid #ddd; padding: 12px; font-weight: bold;">Total Revenue</td>
            <td style="border: 1px solid #ddd; padding: 12px; color: #28a745; font-weight: bold;">₱${totalRevenue.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 12px; font-weight: bold;">Total Profit</td>
            <td style="border: 1px solid #ddd; padding: 12px; color: #007bff; font-weight: bold;">₱${totalProfit.toFixed(2)}</td>
          </tr>
          <tr style="background-color: #f4f4f4;">
            <td style="border: 1px solid #ddd; padding: 12px; font-weight: bold;">Total Sales</td>
            <td style="border: 1px solid #ddd; padding: 12px;">${totalSales}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 12px; font-weight: bold;">Total Items Sold</td>
            <td style="border: 1px solid #ddd; padding: 12px;">${totalItemsSold}</td>
          </tr>
        </table>

        <h2 style="color: #333;">Top Selling Products</h2>
        <table style="width: 100%; max-width: 400px; border-collapse: collapse; font-size: 14px;">
          <thead style="background-color: #007bff; color: white;">
            <tr>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Product Name</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Quantity Sold</th>
            </tr>
          </thead>
          <tbody>
            ${productsHtml}
          </tbody>
        </table>
        
        <p style="margin-top: 30px; font-size: 12px; color: #777;">
          This is an automated report. Please do not reply.
        </p>
      </body>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Daily sales report sent successfully to ${recipientEmail}.`);
  } catch (error) {
    console.error(`Error sending daily sales report to ${recipientEmail}:`, error);
  }
};
// --- END NEW FUNCTION ---


module.exports = {
    sendLowStockEmail,
    sendVerificationEmail,
    sendPoLink,
    sendPOApprovalNotification,
    sendDailySalesReport // --- EXPORT NEW FUNCTION ---
};