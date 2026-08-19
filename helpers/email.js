const nodemailer = require('nodemailer');
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
        from: '"Multi-Role API Support" <[EMAIL_ADDRESS]>',
        to: toEmail,
        subject: 'Password Reset Request',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>Hello,</p>
                <p>We received a request to reset your password. Here is your secure reset token:</p>
                <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                    <strong style="font-size: 24px; letter-spacing: 2px;">${resetToken}</strong>
                </div>
                <p>Submit this token along with your new password to the <code>/auth/reset-password/:token</code> API endpoint.</p>
                <p style="color: #d9534f; font-size: 12px;">This token will expire in 1 hour.</p>
                <p>If you did not request this, you can safely ignore this email.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email successfully sent to ${toEmail}`);
    } catch (error) {
        console.error(`Error sending email to ${toEmail}:`, error.message);
        throw new Error('Failed to send email');
    }
};

module.exports = {
    sendPasswordResetEmail
};
