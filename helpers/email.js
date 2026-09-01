const nodemailer = require('nodemailer');
const logger = require('./logger');
require('dotenv').config();
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendPasswordResetEmail = async (toEmail, resetToken) => {
    const mailOptions = {
        from: `"Multi-Role API Support" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'Password Reset Request',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>Hello,</p>
                <p>We received a request to reset your password. Here is your secure reset token:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password/${resetToken}" 
                       style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #555;">
                    ${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password/${resetToken}
                </p>
                <p style="color: #d9534f; font-size: 12px;">This token will expire in 1 hour.</p>
                <p>If you did not request this, you can safely ignore this email.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Email successfully sent to ${toEmail}`);
    } catch (error) {
        logger.error(`Error sending email to ${toEmail}: ${error.message}`);
        throw new Error('Failed to send email');
    }
};

const sendSellerApprovalEmail = async (toEmail, sellerName) => {
    const mailOptions = {
        from: `"Multi-Role API Support" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'Seller Account Approved',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to Our Platform, ${sellerName}!</h2>
                <p>Great news! Your seller account has been approved by our administration team.</p>
                <p>You can now log in to your dashboard and start listing your products.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/seller/login" 
                       style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Login to Dashboard
                    </a>
                </div>
                <p>If you have any questions, feel free to reply to this email.</p>
                <p>Best regards,<br>The Admin Team</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Approval email successfully sent to ${toEmail}`);
    } catch (error) {
        logger.error(`Error sending approval email to ${toEmail}: ${error.message}`);
    }
};

const sendSellerRejectionEmail = async (toEmail, sellerName) => {
    const mailOptions = {
        from: `"Multi-Role API Support" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'Seller Account Rejected',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Hello ${sellerName},</h2>
                <p>We are writing to inform you that your seller account has been rejected by our administration team.</p>
                <p>If you believe this is an error or would like to appeal, please contact our support team.</p>
                <p>Best regards,<br>The Admin Team</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Rejection email successfully sent to ${toEmail}`);
    } catch (error) {
        logger.error(`Error sending rejection email to ${toEmail}: ${error.message}`);
    }
};

const sendSellerSuspensionEmail = async (toEmail, sellerName) => {
    const mailOptions = {
        from: `"Multi-Role API Support" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'Seller Account Suspended',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Hello ${sellerName},</h2>
                <p>We are writing to inform you that your seller account has been suspended by our administration team.</p>
                <p>If you believe this is an error or would like to appeal, please contact our support team.</p>
                <p>Best regards,<br>The Admin Team</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Email successfully sent to ${toEmail}`);
    } catch (error) {
        logger.error(`Error sending suspension email to ${toEmail}: ${error.message}`);
    }
};

const sendOrderPlacedEmail = async (toEmail, userName, orderId, totalAmount) => {
    const mailOptions = {
        from: `"Multi-Role API Support" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `Order Confirmation - #${orderId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Thank you for your order, ${userName}!</h2>
                <p>We've received your order <strong>#${orderId}</strong> and are processing it now.</p>
                <p><strong>Total Amount:</strong> $${totalAmount}</p>
                <p>You will receive another email when your order status updates.</p>
                <p>Best regards,<br>Our Store Team</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Order placed email sent to ${toEmail}`);
    } catch (error) {
        logger.error(`Error sending order placed email to ${toEmail}: ${error.message}`);
    }
};

const sendOrderStatusUpdateEmail = async (toEmail, userName, orderId, status) => {
    const mailOptions = {
        from: `"Multi-Role API Support" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `Order Update - #${orderId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Hello ${userName},</h2>
                <p>There is an update on your order <strong>#${orderId}</strong>.</p>
                <p>The new status of your order is: <strong style="font-size: 18px; color: #007bff;">${status}</strong></p>
                <p>Thank you for shopping with us!</p>
                <p>Best regards,<br>Our Store Team</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Order status update email sent to ${toEmail}`);
    } catch (error) {
        logger.error(`Error sending order status update email to ${toEmail}: ${error.message}`);
    }
};

module.exports = {
    sendPasswordResetEmail,
    sendSellerApprovalEmail,
    sendSellerRejectionEmail,
    sendSellerSuspensionEmail,
    sendOrderPlacedEmail,
    sendOrderStatusUpdateEmail
};
