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
  }
};


const sendPoLink = async (supplierEmail, supplierName, poNumber, token) => {
  // Construct the link using the client URL from environment variables
  const link = `${process.env.CLIENT_URL}/supplier/po/${token}`; 

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
  }
};

// Notification for Manual Consignment (With Attachment)
const sendManualConsignmentNotification = async (supplierEmail, supplierName, poNumber, items, pdfBuffer) => {
  
  const itemsHtml = items.map(item => 
    `<tr>
      <td style="border: 1px solid #ddd; padding: 8px;">${item.product?.name || 'Item'}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">₱${item.cost}</td>
    </tr>`
  ).join('');

  const mailOptions = {
    from: `"VinJack System" <${process.env.EMAIL_USER}>`,
    to: supplierEmail,
    subject: `Consignment Agreement Received: ${poNumber}`,
    html: `
      <p>Hello ${supplierName},</p>
      <p>We have processed the manual consignment agreement for PO <strong>${poNumber}</strong>.</p>
      <p>The items have been encoded into our system and the signed agreement you provided is attached to this email for your records.</p>
      
      <h3>Consignment Items:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background-color: #f2f2f2;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Qty</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Unit Cost</th>
        </tr>
        ${itemsHtml}
      </table>

      <p>Thank you,</p>
      <p>VinJack Motorworks</p>
    `,
    attachments: [
        {
            filename: `Consignment_Agreement_${poNumber}.pdf`,
            content: pdfBuffer, 
            contentType: 'application/pdf'
        }
    ]
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Manual consignment email (with attachment) sent to ${supplierEmail}`);
  } catch (error) {
    console.error(`Error sending manual consignment email:`, error);
  }
};

// --- UPDATED: Approval Notification with Visual Status ---
const sendPOApprovalNotification = async (recipientEmail, supplierName, poNumber, pdfBuffer) => {
    const mailOptions = {
        from: `"VinJack System" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: `Purchase Order ${poNumber} Approved & Countersigned`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2e7d32;">Purchase Order Approved</h2>
                <p>Hello ${supplierName},</p>
                <p>Your submission for Purchase Order <strong>${poNumber}</strong> has been <strong>APPROVED</strong> by VinJack Motorworks.</p>
                
                <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #333; font-size: 14px;">Current Status:</h3>
                    <table width="100%" style="font-size: 12px; text-align: center; border-collapse: collapse;">
                        <tr>
                            <td style="width: 25%; color: #2e7d32; padding-bottom: 5px;">&#10004;</td>
                            <td style="width: 25%; color: #2e7d32; padding-bottom: 5px;">&#10004;</td>
                            <td style="width: 25%; color: #1976d2; font-size: 16px; padding-bottom: 5px;">&#9679;</td>
                            <td style="width: 25%; color: #999; font-size: 16px; padding-bottom: 5px;">&#9675;</td>
                        </tr>
                        <tr>
                            <td style="color: #2e7d32;">Issued</td>
                            <td style="color: #2e7d32;">Signed</td>
                            <td style="color: #1976d2; font-weight: bold; border-top: 2px solid #1976d2;">Countersigned</td>
                            <td style="color: #999;">Delivery</td>
                        </tr>
                    </table>
                </div>

                <p>Attached is the final agreement, countersigned by the owner.</p>
                <p>We are now ready to receive the stock.</p>
                <p>Sincerely,<br/>VinJack Motorworks</p>
            </div>
        `,
        attachments: pdfBuffer ? [
            {
                filename: `Countersigned_Agreement_${poNumber}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ] : []
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`PO Approval (Countersigned) email sent to ${recipientEmail}`);
    } catch (error) {
        console.error(`Error sending PO Approval email:`, error);
    }
};

// --- UPDATED: Completion Notification with Visual Status ---
const sendPOCompletionNotification = async (recipientEmail, supplierName, poNumber, pdfBuffer) => {
    const mailOptions = {
        from: `"VinJack System" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: `Stock Received - Consignment PO ${poNumber} Completed`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2e7d32;">Stock Received & Completed</h2>
                <p>Hello ${supplierName},</p>
                <p>This email is to notify you that we have successfully received the stock for Consignment Order <strong>${poNumber}</strong>.</p>
                
                <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #333; font-size: 14px;">Current Status:</h3>
                    <table width="100%" style="font-size: 12px; text-align: center; border-collapse: collapse;">
                        <tr>
                            <td style="width: 25%; color: #2e7d32; padding-bottom: 5px;">&#10004;</td>
                            <td style="width: 25%; color: #2e7d32; padding-bottom: 5px;">&#10004;</td>
                            <td style="width: 25%; color: #2e7d32; padding-bottom: 5px;">&#10004;</td>
                            <td style="width: 25%; color: #2e7d32; padding-bottom: 5px;">&#10004;</td>
                        </tr>
                        <tr>
                            <td style="color: #2e7d32;">Issued</td>
                            <td style="color: #2e7d32;">Signed</td>
                            <td style="color: #2e7d32;">Countersigned</td>
                            <td style="color: #2e7d32; font-weight: bold; border-top: 2px solid #2e7d32;">Delivery & Receiving</td>
                        </tr>
                    </table>
                </div>

                <p>The inventory has been updated in our system.</p>
                <p>Attached is the final signed agreement for your records.</p>
                <p>Sincerely,<br/>VinJack Motorworks</p>
            </div>
        `,
        attachments: pdfBuffer ? [
            {
                filename: `Final_Agreement_${poNumber}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ] : []
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`PO Completion email sent to ${recipientEmail}`);
    } catch (error) {
        console.error(`Error sending PO Completion email:`, error);
    }
};

const sendDailySalesReport = async ({ reportData, recipientEmail, reportDateStr }) => {
  const { totalRevenue, totalProfit, totalSales, totalItemsSold, topSellingProducts } = reportData;

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


module.exports = {
    sendLowStockEmail,
    sendVerificationEmail,
    sendPoLink,
    sendPOApprovalNotification,
    sendDailySalesReport,
    sendManualConsignmentNotification,
    sendPOCompletionNotification
};