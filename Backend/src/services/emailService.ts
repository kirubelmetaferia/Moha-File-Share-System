import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

const getEmailEnabled = () => process.env.EMAIL_ENABLED === 'true';

export const sendPasswordResetEmail = async (email: string, fullName: string, token: string) => {
    if (!getEmailEnabled()) {
        console.log(`[EMAIL DEV MODE] Password reset email meant for ${email}. Token: ${token}`);
        return;
    }

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    
    const info = await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Moha File Share'}" <${process.env.EMAIL_FROM || 'noreply@moha.local'}>`,
        to: email,
        subject: 'Reset your Moha File Share password',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a; text-align: center;">Moha File Share</h2>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p>Hello ${fullName},</p>
                <p>You requested a password reset for your Moha File Share account. This link will expire in 30 minutes.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Secure Reset Password</a>
                </div>
                <p style="font-size: 14px; color: #64748b;">
                    <strong>Security Warning:</strong> Do not share this link with anyone. If you did not request a password reset, please ignore this email or contact support if you have concerns.
                </p>
            </div>
        `
    });
    
    if (process.env.EMAIL_HOST?.includes('ethereal.email')) {
        console.log(`[Ethereal Email] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
};

export const sendAdminPasswordResetNotification = async (email: string, fullName: string, employeeId: string, resetLink: string) => {
    if (!getEmailEnabled()) {
        console.log(`[EMAIL DEV MODE] Admin password reset email meant for ${email}. Link: ${resetLink}`);
        return;
    }

    const info = await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Moha File Share'}" <${process.env.EMAIL_FROM || 'noreply@moha.local'}>`,
        to: email,
        subject: 'Your Moha File Share password has been reset',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a; text-align: center;">Moha File Share</h2>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p>Hello ${fullName} (${employeeId}),</p>
                <p>An administrator has reset your password for your Moha File Share account.</p>
                <p>Please use the button below to set up a new secure password. You will be required to change it before you can access your account.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Set New Password</a>
                </div>
                <p style="font-size: 14px; color: #64748b;">
                    <strong>Security Notice:</strong> If you were not expecting this, please contact your administrator immediately.
                </p>
            </div>
        `
    });
    
    if (process.env.EMAIL_HOST?.includes('ethereal.email')) {
        console.log(`[Ethereal Email] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
};

export const sendPasswordChangedNotification = async (email: string, fullName: string) => {
    if (!getEmailEnabled()) {
        console.log(`[EMAIL DEV MODE] Password changed notification meant for ${email}.`);
        return;
    }

    const info = await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Moha File Share'}" <${process.env.EMAIL_FROM || 'noreply@moha.local'}>`,
        to: email,
        subject: 'Your Moha File Share password was changed',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a; text-align: center;">Moha File Share</h2>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p>Hello ${fullName},</p>
                <p>This is a confirmation that the password for your Moha File Share account has been successfully changed.</p>
                <p style="font-size: 14px; color: #64748b;">
                    <strong>Security Notice:</strong> If you did not make this change, please contact your administrator immediately.
                </p>
            </div>
        `
    });
    
    if (process.env.EMAIL_HOST?.includes('ethereal.email')) {
        console.log(`[Ethereal Email] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
};
