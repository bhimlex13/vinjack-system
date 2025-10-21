// server/utils/notificationManager.js
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');

/**
 * Creates and saves notifications.
 * Can target a specific user, all users with a specific role, or a list of users.
 */
const createNotification = async (notificationData) => {
  // --- MODIFIED: Destructure the new 'image' field ---
  const { recipientId, recipientRole, message, type, link, image } = notificationData;
  
  try {
    let recipients = [];
    if (recipientId) {
      recipients.push({ _id: recipientId });
    } else if (recipientRole) {
      recipients = await User.find({ role: recipientRole }).select('_id');
    }

    if (recipients.length === 0) return []; // Return empty array if no recipients

    const notifications = recipients.map(recipient => ({
      user: recipient._id,
      message,
      type,
      link,
      image: image || '', // --- MODIFIED: Add the image to the notification object ---
    }));
    
    // MODIFIED: Capture the result of the database operation
    const createdNotifications = await Notification.insertMany(notifications);
    
    // ADDED: Return the newly created notifications
    return createdNotifications;

  } catch (error) {
    console.error('Failed to create notification:', error);
    return []; // Return empty array on error
  }
};

module.exports = { createNotification };