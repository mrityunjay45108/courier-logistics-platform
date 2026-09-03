import { Resend } from 'resend';
import { env } from '../config';

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<boolean> {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  
  if (!resendClient || !env.RESEND_API_KEY) {
    console.log(`[EmailService - DEV LOG] Password reset link for ${to}: ${resetUrl}`);
    return true;
  }

  try {
    const response = await resendClient.emails.send({
      from: fromEmail,
      to: [to],
      subject: 'Reset your password - Apex Logistics',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0284c7;">Apex Courier & Logistics</h2>
          <p>Hello ${name},</p>
          <p>We received a request to reset your password. Click the secure link below to choose a new password. This link will expire in 15 minutes.</p>
          <div style="margin: 25px 0;">
            <a href="${resetUrl}" style="background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #64748b; font-size: 13px;">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    });
    console.log(`[EmailService] Password reset sent to ${to}:`, response.data?.id);
    return true;
  } catch (error) {
    console.error(`[EmailService Error] Failed to send password reset to ${to}:`, error);
    return false;
  }
}

export async function sendEmailVerification(to: string, name: string, token: string): Promise<boolean> {
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  
  if (!resendClient || !env.RESEND_API_KEY) {
    console.log(`[EmailService - DEV LOG] Email verification link for ${to}: ${verifyUrl}`);
    return true;
  }

  try {
    await resendClient.emails.send({
      from: fromEmail,
      to: [to],
      subject: 'Verify your email - Apex Logistics',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Welcome to Apex Logistics, ${name}!</h2>
          <p>Please verify your email address by clicking the link below:</p>
          <p><a href="${verifyUrl}" style="background-color: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error(`[EmailService Error] Failed to send verification to ${to}:`, error);
    return false;
  }
}
