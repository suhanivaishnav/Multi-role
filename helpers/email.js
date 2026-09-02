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
            <div style="background-color: #f4f7f6; padding: 40px 20px; font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.05);">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Password Reset</h1>
                    </div>
                    <div style="padding: 40px 30px; color: #333333; line-height: 1.6; font-size: 16px;">
                        <h2 style="margin-top: 0; color: #1a202c; font-size: 22px;">Hello there,</h2>
                        <p>We received a request to reset the password for your account. You can easily set a new password by clicking the button below:</p>
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password/${resetToken}" 
                               style="background-color: #667eea; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);">
                                Reset My Password
                            </a>
                        </div>
                        <p>Or copy and paste this link into your browser:</p>
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password/${resetToken}" style="word-break: break-all; color: #4a5568; text-decoration: none; font-size: 14px;">
                                ${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password/${resetToken}
                            </a>
                        </div>
                        <p style="color: #e53e3e; font-size: 14px; margin-top: 25px; font-weight: 500;">⚠️ This secure link will expire in 1 hour.</p>
                        <p style="color: #718096; font-size: 14px; margin-bottom: 0;">If you didn't request a password reset, you can safely ignore this email.</p>
                    </div>
                    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #a0aec0; font-size: 13px; border-top: 1px solid #edf2f7;">
                        <p style="margin: 0;">&copy; ${new Date().getFullYear()} Multi-Role Platform. All rights reserved.</p>
                    </div>
                </div>
            </div>`
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
        subject: 'Welcome! Your Seller Account is Approved',
        html: `
            <div style="background-color: #f4f7f6; padding: 40px 20px; font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.05);">
                    <div style="background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); padding: 30px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Account Approved</h1>
                    </div>
                    <div style="padding: 40px 30px; color: #333333; line-height: 1.6; font-size: 16px;">
                        <h2 style="margin-top: 0; color: #1a202c; font-size: 22px;">Welcome to our platform, ${sellerName}!</h2>
                        <p>We have fantastic news! Your seller account application has been <strong>successfully approved</strong> by our team.</p>
                        <p>You can now log in to your personalized dashboard, set up your storefront, and start listing your amazing products for our customers.</p>
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/seller/login" 
                               style="background-color: #38a169; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(56, 161, 105, 0.25);">
                                Access Your Dashboard
                            </a>
                        </div>
                        <p style="color: #4a5568;">If you need any help getting started, our support team is just an email away.</p>
                        <p style="margin-bottom: 0;">We're thrilled to have you partner with us!<br><br>Best regards,<br><strong>The Admin Team</strong></p>
                    </div>
                    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #a0aec0; font-size: 13px; border-top: 1px solid #edf2f7;">
                        <p style="margin: 0;">&copy; ${new Date().getFullYear()} Multi-Role Platform. All rights reserved.</p>
                    </div>
                </div>
            </div>`
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
        subject: 'Update on Your Seller Account Application',
        html: `
            <div style="background-color: #f4f7f6; padding: 40px 20px; font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.05);">
                    <div style="background: linear-gradient(135deg, #718096 0%, #4a5568 100%); padding: 30px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Application Update</h1>
                    </div>
                    <div style="padding: 40px 30px; color: #333333; line-height: 1.6; font-size: 16px;">
                        <h2 style="margin-top: 0; color: #1a202c; font-size: 22px;">Hello ${sellerName},</h2>
                        <p>Thank you for your interest in becoming a seller on our platform. We appreciate the time you took to submit your application.</p>
                        <div style="background-color: #fff5f5; border-left: 4px solid #fc8181; padding: 15px 20px; margin: 25px 0; border-radius: 0 6px 6px 0;">
                            <p style="margin: 0; color: #c53030;">After careful review, we regret to inform you that we cannot approve your seller account at this time.</p>
                        </div>
                        <p>If you believe this decision was made in error, or if you would like to provide additional information to support your application, please reach out to our support team.</p>
                        <p style="margin-bottom: 0;">We wish you the best in your future endeavors.<br><br>Sincerely,<br><strong>The Admin Team</strong></p>
                    </div>
                    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #a0aec0; font-size: 13px; border-top: 1px solid #edf2f7;">
                        <p style="margin: 0;">&copy; ${new Date().getFullYear()} Multi-Role Platform. All rights reserved.</p>
                    </div>
                </div>
            </div>`
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
        subject: 'Action Required: Seller Account Suspended',
        html: `
            <div style="background-color: #f4f7f6; padding: 40px 20px; font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.05);">
                    <div style="background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); padding: 30px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Account Suspended</h1>
                    </div>
                    <div style="padding: 40px 30px; color: #333333; line-height: 1.6; font-size: 16px;">
                        <h2 style="margin-top: 0; color: #1a202c; font-size: 22px;">Hello ${sellerName},</h2>
                        <p>We are writing to inform you of an urgent matter regarding your seller account.</p>
                        <div style="background-color: #fff5f5; border: 1px solid #feb2b2; padding: 20px; margin: 25px 0; border-radius: 8px; text-align: center;">
                            <h3 style="margin-top: 0; color: #c53030; font-size: 18px;">Your account has been suspended.</h3>
                            <p style="margin-bottom: 0; color: #742a2a; font-size: 15px;">During this time, your products are hidden from the marketplace and you cannot access your seller dashboard.</p>
                        </div>
                        <p>This action is typically taken due to policy violations, unusual account activity, or security concerns.</p>
                        <p>To resolve this issue or appeal the suspension, please reply directly to this email or contact our support team immediately.</p>
                        <p style="margin-bottom: 0;">Regards,<br><strong>The Admin Team</strong></p>
                    </div>
                    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #a0aec0; font-size: 13px; border-top: 1px solid #edf2f7;">
                        <p style="margin: 0;">&copy; ${new Date().getFullYear()} Multi-Role Platform. All rights reserved.</p>
                    </div>
                </div>
            </div>`
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Email successfully sent to ${toEmail}`);
    } catch (error) {
        logger.error(`Error sending suspension email to ${toEmail}: ${error.message}`);
    }
};

const sendOrderPlacedEmail = async (toEmail, userName, orderId, totalAmount, items = []) => {
    const itemsHtml = items.map(item => `
        <div style="padding: 10px 0; border-bottom: 1px solid #bee3f8;">
            <p style="margin: 0; font-size: 15px; font-weight: 600; color: #2d3748;">${item.name || 'Unknown Item'}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #4a5568;">${item.description || ''}</p>
        </div>
    `).join('');

    const mailOptions = {
        from: `"Multi-Role API Support" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `Order Confirmation - #${orderId}`,
        html: `
            <div style="background-color: #f4f7f6; padding: 40px 20px; font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.05);">
                    <div style="background: linear-gradient(135deg, #3182ce 0%, #2b6cb0 100%); padding: 30px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Order Confirmed</h1>
                    </div>
                    <div style="padding: 40px 30px; color: #333333; line-height: 1.6; font-size: 16px;">
                        <h2 style="margin-top: 0; color: #1a202c; font-size: 22px;">Thank you for your purchase, ${userName}!</h2>
                        <p>We are thrilled to let you know that we've successfully received your order and our team is now processing it.</p>
                        
                        <div style="background-color: #ebf8ff; border-radius: 8px; padding: 20px; margin: 30px 0; border: 1px solid #bee3f8;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #bee3f8; padding-bottom: 15px;">
                                <div>
                                    <p style="margin: 0; font-size: 13px; color: #4a5568; text-transform: uppercase; font-weight: 600;">Order ID</p>
                                    <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 700; color: #2b6cb0;">#${orderId}</p>
                                </div>
                                <div style="text-align: right;">
                                    <p style="margin: 0; font-size: 13px; color: #4a5568; text-transform: uppercase; font-weight: 600;">Total</p>
                                    <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 700; color: #2b6cb0;">$${totalAmount}</p>
                                </div>
                            </div>

                            <div style="margin-top: 15px; margin-bottom: 15px;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #2b6cb0; text-transform: uppercase; font-weight: 600;">Order Items</p>
                                ${itemsHtml || '<p style="margin: 0; font-size: 14px; color: #4a5568;">No item details available.</p>'}
                            </div>
                            
                            <p style="margin: 20px 0 0 0; font-size: 14px; color: #2c5282; text-align: center;">We'll notify you again when your order ships.</p>
                        </div>
                        
                        <p>You can check the status of your order at any time by visiting your account.</p>
                        <p style="margin-bottom: 0;">Thanks for shopping with us!<br><br>Best,<br><strong>Our Store Team</strong></p>
                    </div>
                    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #a0aec0; font-size: 13px; border-top: 1px solid #edf2f7;">
                        <p style="margin: 0;">&copy; ${new Date().getFullYear()} Multi-Role Platform. All rights reserved.</p>
                    </div>
                </div>
            </div>`
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
        subject: `Update on Order #${orderId}`,
        html: `
            <div style="background-color: #f4f7f6; padding: 40px 20px; font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.05);">
                    <div style="background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%); padding: 30px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Order Status Update</h1>
                    </div>
                    <div style="padding: 40px 30px; color: #333333; line-height: 1.6; font-size: 16px;">
                        <h2 style="margin-top: 0; color: #1a202c; font-size: 22px;">Hello ${userName},</h2>
                        <p>We have an important update regarding your recent order <strong>#${orderId}</strong>.</p>
                        
                        <div style="text-align: center; background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin: 30px 0;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #718096; text-transform: uppercase; font-weight: 600;">Current Status</p>
                            <span style="display: inline-block; background-color: #ebf8ff; color: #2b6cb0; padding: 8px 20px; border-radius: 9999px; font-size: 18px; font-weight: 700; text-transform: capitalize; border: 1px solid #bee3f8;">
                                ${status}
                            </span>
                        </div>
                        
                        <p>If you have any questions or concerns about your order, please don't hesitate to reach out to our customer service team.</p>
                        <p style="margin-bottom: 0;">Thank you for your business!<br><br>Best,<br><strong>Our Store Team</strong></p>
                    </div>
                    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #a0aec0; font-size: 13px; border-top: 1px solid #edf2f7;">
                        <p style="margin: 0;">&copy; ${new Date().getFullYear()} Multi-Role Platform. All rights reserved.</p>
                    </div>
                </div>
            </div>`
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
