# VinJack Motorworks Sales and Inventory Management System

![VinJack Logo](client/public/assets/vinjack_logo.png)

## Overview
The **Web-Based Sales and Inventory Management System for VinJack Motorworks** is a full-stack MERN application developed as an IT Capstone Project by Alexander M. Oro, Selwyn Miles A. Jimenez, and Joshua H. Villa-real (STI College Marikina). 

This system is designed to replace manual, notebook-based operations with a centralized, secure, and accessible digital platform. It automates inventory tracking, sales documentation, and supplier transaction management to improve operational accuracy, efficiency, and profitability for a motorcycle repair and maintenance shop.

## Key Features

### 🔐 Security & Role-Based Access Control (RBAC)
- **Super Admin (Owner):** Full system access including user management, dashboard filtering, audit logs, and database backup/restore.
- **Admin (Mechanic):** Access to record service part usage and customer motorcycle profiles.
- **Salesperson (Clerk):** Access to walk-in sales recording (POS), inventory status, and delivery logging.
- Passwords secured via `bcrypt` encryption.

### 📦 Inventory Management
- Real-time stock monitoring and automatic deductions upon sales or services.
- Item classification (Consumables vs. Replacement Parts).
- Automatic low-stock visual warnings and email alerts.
- Optional QR code integration for fast item lookup.

### 🛒 Sales & Service (POS)
- Walk-in point-of-sale interface preventing sales if stock is insufficient.
- Service transaction logging (e.g., CVT cleaning, remapping) with mechanic assignment.
- Generation of digital receipts and support for physical receipt image uploads.
- Secure processing of product returns and restock validation.

### 🏢 Supplier & Purchasing
- Comprehensive supplier profiles with payment terms (Cash, GCash, Consignment).
- Purchase Order (PO) creation for direct purchases and consignments.
- Delivery verification and receipt uploads.
- Consignment payable tracking.

### 📊 Dashboard & Reporting
- Visual summaries of Total Revenue, Profit, Sales, and Top-Selling Products.
- Exportable daily, weekly, and monthly reports.
- Advanced filtering by date, category, and supplier.

### 🛠 System Maintenance
- **Audit Trail:** Immutable logs of user activities (login/logout, item creation, sales, etc.) for accountability.
- **Backup & Restore:** Integration with Google Cloud Storage (GCS) for secure, on-demand or scheduled database backups.

## Tech Stack
- **Frontend:** React.js, Tailwind CSS, Vite
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Community Edition / MongoDB Atlas (Mongoose ODM)
- **Additional Tools:** Nodemailer (Email alerts), Socket.io (Real-time notifications), Google Cloud Storage (Backups)

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/bhimlex13/vinjack-system.git
   cd vinjack-system
   ```

2. **Install Backend Dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Install Frontend Dependencies:**
   ```bash
   cd ../client
   npm install
   ```

4. **Environment Variables:**
   Create `.env` files in both the `client` and `server` directories following the structure required for your MongoDB Atlas connection, JWT secrets, and Nodemailer credentials.

5. **Run the Application (Development):**
   - **Server:** `npm run dev` (Runs on port 5000)
   - **Client:** `npm start` (Runs on port 3000)

## License
This system was developed as a Capstone Project for academic and specific business operational use.
