import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * EmailService handles sending authentication-related emails
 * including password reset emails, welcome emails, and account linking notifications.
 * 
 * Configuration is done via environment variables:
 * - SMTP_HOST: SMTP server hostname
 * - SMTP_PORT: SMTP server port
 * - SMTP_USER: SMTP authentication username
 * - SMTP_PASSWORD: SMTP authentication password
 * - SMTP_FROM_EMAIL: Sender email address
 * - SMTP_FROM_NAME: Sender display name (optional, defaults to "Muster")
 */
class EmailService {
  private transporter: Transporter | null = null;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@muster.app';
    this.fromName = process.env.SMTP_FROM_NAME || 'Muster';
    this.initializeTransporter();
  }

  /**
   * Initialize the nodemailer transporter with SMTP configuration
   */
  private initializeTransporter(): void {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    // If SMTP is not configured, log a warning but don't throw
    // This allows the app to run in development without email configured
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      console.warn('SMTP configuration incomplete. Email functionality will be disabled.');
      console.warn('Required environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: parseInt(smtpPort, 10) === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.transporter = null;
    }
  }

  /**
   * Send a password reset email with a reset token
   * @param email - Recipient email address
   * @param resetToken - Unique password reset token
   * @throws Error if email sending fails
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    if (!this.transporter) {
      console.warn(`Email not sent (SMTP not configured): Password reset to ${email}`);
      console.log(`Reset token: ${resetToken}`);
      return;
    }

    // Construct the reset link
    // In production, this should use the actual frontend URL from environment variables
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const subject = 'Reset Your Muster Password';
    const htmlContent = this.getPasswordResetEmailTemplate(resetLink);
    const textContent = this.getPasswordResetEmailText(resetLink);

    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: email,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error(`Failed to send password reset email to ${email}:`, error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send a welcome email to a newly registered user (optional)
   * @param email - Recipient email address
   * @param firstName - User's first name
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    if (!this.transporter) {
      console.warn(`Email not sent (SMTP not configured): Welcome email to ${email}`);
      return;
    }

    const subject = 'Welcome to Muster!';
    const htmlContent = this.getWelcomeEmailTemplate(firstName);
    const textContent = this.getWelcomeEmailText(firstName);

    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: email,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`Welcome email sent to ${email}`);
    } catch (error) {
      console.error(`Failed to send welcome email to ${email}:`, error);
      // Don't throw - welcome emails are optional and shouldn't block registration
    }
  }

  /**
   * Send an account linked notification email (optional)
   * @param email - Recipient email address
   * @param provider - SSO provider name (e.g., "Apple", "Google")
   */
  async sendAccountLinkedEmail(email: string, provider: string): Promise<void> {
    if (!this.transporter) {
      console.warn(`Email not sent (SMTP not configured): Account linked email to ${email}`);
      return;
    }

    const subject = 'New Sign-In Method Added';
    const htmlContent = this.getAccountLinkedEmailTemplate(provider);
    const textContent = this.getAccountLinkedEmailText(provider);

    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: email,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`Account linked email sent to ${email}`);
    } catch (error) {
      console.error(`Failed to send account linked email to ${email}:`, error);
      // Don't throw - notification emails are optional
    }
  }

  /**
   * Generate HTML template for password reset email
   */
  private getPasswordResetEmailTemplate(resetLink: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Muster Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1C2320;
      background-color: #F7F4EE;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #2D5F3F;
      color: #FFFFFF;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 32px 24px;
    }
    .content p {
      margin: 0 0 16px 0;
      color: #1C2320;
    }
    .button {
      display: inline-block;
      background-color: #2D5F3F;
      color: #FFFFFF;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 17px;
      margin: 24px 0;
    }
    .button:hover {
      background-color: #2A6644;
    }
    .expiration-notice {
      background-color: #FFF4E6;
      border-left: 4px solid #E8A030;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .expiration-notice p {
      margin: 0;
      color: #4A6058;
      font-size: 14px;
    }
    .security-notice {
      background-color: #F7F4EE;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .security-notice p {
      margin: 0;
      color: #6B7C76;
      font-size: 13px;
    }
    .footer {
      background-color: #F7F4EE;
      padding: 24px;
      text-align: center;
      color: #6B7C76;
      font-size: 13px;
    }
    .footer a {
      color: #2D5F3F;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>We received a request to reset your Muster password. Click the button below to create a new password:</p>
      <div style="text-align: center;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </div>
      <div class="expiration-notice">
        <p><strong>⏰ This link expires in 1 hour</strong></p>
        <p>For security reasons, this password reset link will expire in 1 hour. If you need a new link, you can request another password reset.</p>
      </div>
      <div class="security-notice">
        <p><strong>🔒 Security Notice</strong></p>
        <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      </div>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #1B2A4A; font-size: 13px;">${resetLink}</p>
    </div>
    <div class="footer">
      <p>Need help? Contact us at <a href="mailto:support@muster.app">support@muster.app</a></p>
      <p>&copy; ${new Date().getFullYear()} Muster. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text version of password reset email
   */
  private getPasswordResetEmailText(resetLink: string): string {
    return `
Reset Your Muster Password

Hello,

We received a request to reset your Muster password. Click the link below to create a new password:

${resetLink}

⏰ This link expires in 1 hour

For security reasons, this password reset link will expire in 1 hour. If you need a new link, you can request another password reset.

🔒 Security Notice

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

Need help? Contact us at support@muster.app

© ${new Date().getFullYear()} Muster. All rights reserved.
    `.trim();
  }

  /**
   * Generate HTML template for welcome email
   */
  private getWelcomeEmailTemplate(firstName: string): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Muster</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1C2320;
      background-color: #F7F4EE;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #2D5F3F;
      color: #FFFFFF;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .tagline {
      margin: 8px 0 0 0;
      font-size: 17px;
      opacity: 0.9;
    }
    .content {
      padding: 32px 24px;
    }
    .content p {
      margin: 0 0 16px 0;
      color: #1C2320;
    }
    .button {
      display: inline-block;
      background-color: #2D5F3F;
      color: #FFFFFF;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 17px;
      margin: 24px 0;
    }
    .features {
      margin: 24px 0;
    }
    .feature {
      margin: 16px 0;
      padding-left: 32px;
      position: relative;
    }
    .feature::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #2D5F3F;
      font-weight: bold;
      font-size: 20px;
    }
    .footer {
      background-color: #F7F4EE;
      padding: 24px;
      text-align: center;
      color: #6B7C76;
      font-size: 13px;
    }
    .footer a {
      color: #2D5F3F;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Muster!</h1>
      <p class="tagline">Find a game. Find your people.</p>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>Welcome to Muster! We're excited to have you join our community of sports enthusiasts.</p>
      <p>With Muster, you can:</p>
      <div class="features">
        <div class="feature">Find and join sports events near you</div>
        <div class="feature">Book facilities and courts</div>
        <div class="feature">Create and manage your own teams</div>
        <div class="feature">Connect with other players</div>
      </div>
      <div style="text-align: center;">
        <a href="${frontendUrl}" class="button">Get Started</a>
      </div>
      <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
    </div>
    <div class="footer">
      <p>Need help? Contact us at <a href="mailto:support@muster.app">support@muster.app</a></p>
      <p>&copy; ${new Date().getFullYear()} Muster. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text version of welcome email
   */
  private getWelcomeEmailText(firstName: string): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
    
    return `
Welcome to Muster!

Find a game. Find your people.

Hi ${firstName},

Welcome to Muster! We're excited to have you join our community of sports enthusiasts.

With Muster, you can:
✓ Find and join sports events near you
✓ Book facilities and courts
✓ Create and manage your own teams
✓ Connect with other players

Get started: ${frontendUrl}

If you have any questions or need help getting started, don't hesitate to reach out to our support team.

Need help? Contact us at support@muster.app

© ${new Date().getFullYear()} Muster. All rights reserved.
    `.trim();
  }

  /**
   * Generate HTML template for account linked email
   */
  private getAccountLinkedEmailTemplate(provider: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Sign-In Method Added</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1C2320;
      background-color: #F7F4EE;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #2D5F3F;
      color: #FFFFFF;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 32px 24px;
    }
    .content p {
      margin: 0 0 16px 0;
      color: #1C2320;
    }
    .provider-badge {
      background-color: #F7F4EE;
      padding: 16px;
      margin: 24px 0;
      border-radius: 8px;
      text-align: center;
    }
    .provider-badge p {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
      color: #2D5F3F;
    }
    .security-notice {
      background-color: #FFF4E6;
      border-left: 4px solid #E8A030;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .security-notice p {
      margin: 0;
      color: #4A6058;
      font-size: 14px;
    }
    .footer {
      background-color: #F7F4EE;
      padding: 24px;
      text-align: center;
      color: #6B7C76;
      font-size: 13px;
    }
    .footer a {
      color: #2D5F3F;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Sign-In Method Added</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Your Muster account has been successfully linked with a new sign-in method:</p>
      <div class="provider-badge">
        <p>🔗 ${provider}</p>
      </div>
      <p>You can now sign in to Muster using your ${provider} account in addition to your existing sign-in methods.</p>
      <div class="security-notice">
        <p><strong>🔒 Security Notice</strong></p>
        <p>If you didn't authorize this change, please contact our support team immediately at support@muster.app. We recommend changing your password as a precaution.</p>
      </div>
    </div>
    <div class="footer">
      <p>Need help? Contact us at <a href="mailto:support@muster.app">support@muster.app</a></p>
      <p>&copy; ${new Date().getFullYear()} Muster. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text version of account linked email
   */
  private getAccountLinkedEmailText(provider: string): string {
    return `
New Sign-In Method Added

Hello,

Your Muster account has been successfully linked with a new sign-in method:

🔗 ${provider}

You can now sign in to Muster using your ${provider} account in addition to your existing sign-in methods.

🔒 Security Notice

If you didn't authorize this change, please contact our support team immediately at support@muster.app. We recommend changing your password as a precaution.

Need help? Contact us at support@muster.app

© ${new Date().getFullYear()} Muster. All rights reserved.
    `.trim();
  }
}

// Export a singleton instance
export default new EmailService();
