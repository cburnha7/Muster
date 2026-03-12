# EmailService

The `EmailService` handles sending authentication-related emails for the Muster platform, including password reset emails, welcome emails, and account linking notifications.

## Features

- **Password Reset Emails**: Send secure password reset links with 1-hour expiration
- **Welcome Emails**: Send welcome messages to newly registered users (optional)
- **Account Linked Emails**: Notify users when SSO providers are linked (optional)
- **Graceful Degradation**: Works without SMTP configuration in development
- **HTML & Plain Text**: All emails include both HTML and plain text versions
- **Brand Consistent**: Uses Muster brand colors and styling

## Configuration

The EmailService requires the following environment variables:

```bash
# Required for email functionality
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<your-sendgrid-api-key>

# Optional (with defaults)
SMTP_FROM_EMAIL=noreply@muster.app
SMTP_FROM_NAME=Muster
FRONTEND_URL=http://localhost:8081
```

### SMTP Providers

The service works with any SMTP provider. Common options:

**SendGrid** (Recommended for production):
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<your-sendgrid-api-key>
```

**Gmail** (For testing only):
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=<app-specific-password>
```

**AWS SES**:
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=<your-aws-smtp-username>
SMTP_PASSWORD=<your-aws-smtp-password>
```

**Mailgun**:
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=<your-mailgun-username>
SMTP_PASSWORD=<your-mailgun-password>
```

## Usage

### Import the Service

```typescript
import EmailService from '../services/EmailService';
```

### Send Password Reset Email

```typescript
// Generate a reset token (typically done by AuthService)
const resetToken = 'unique-secure-token-123';

// Send the email
await EmailService.sendPasswordResetEmail(
  'user@example.com',
  resetToken
);
```

The email includes:
- A reset link with the token: `${FRONTEND_URL}/reset-password?token=${resetToken}`
- 1-hour expiration notice
- Security notice for users who didn't request the reset

### Send Welcome Email (Optional)

```typescript
await EmailService.sendWelcomeEmail(
  'user@example.com',
  'John' // firstName
);
```

The email includes:
- Personalized greeting
- Platform features overview
- Getting started link

### Send Account Linked Email (Optional)

```typescript
await EmailService.sendAccountLinkedEmail(
  'user@example.com',
  'Google' // provider name
);
```

The email includes:
- Confirmation of linked provider
- Security notice
- Support contact information

## Email Templates

All emails use:
- **Brand Colors**: Grass green (#3D8C5E) for primary elements
- **Responsive Design**: Mobile-friendly layouts
- **Accessibility**: Proper semantic HTML and alt text
- **Plain Text Fallback**: For email clients that don't support HTML

### Password Reset Email Template

- **Subject**: "Reset Your Muster Password"
- **Key Elements**:
  - Prominent reset button
  - 1-hour expiration warning (highlighted in Court orange)
  - Security notice
  - Plain text link fallback
  - Support contact

### Welcome Email Template

- **Subject**: "Welcome to Muster!"
- **Key Elements**:
  - Personalized greeting
  - Platform tagline: "Find a game. Find your people."
  - Feature list with checkmarks
  - Get started button
  - Support contact

### Account Linked Email Template

- **Subject**: "New Sign-In Method Added"
- **Key Elements**:
  - Provider badge
  - Confirmation message
  - Security warning (highlighted in Court orange)
  - Support contact

## Development Mode

When SMTP is not configured (missing environment variables), the service:
- Logs a warning on initialization
- Logs email details to console instead of sending
- Includes reset tokens in console output for testing
- Does not throw errors (graceful degradation)

This allows development without email configuration.

## Error Handling

### Password Reset Emails
- **Throws** on failure (critical for security)
- Logs error details
- Returns error message: "Failed to send password reset email"

### Welcome & Account Linked Emails
- **Does not throw** on failure (non-critical)
- Logs error details
- Continues execution (doesn't block registration/linking)

## Testing

### Manual Testing

Run the test script:
```bash
cd server
npx tsx src/scripts/test-email-service.ts
```

This tests all three email types without requiring SMTP configuration.

### Integration Testing

```typescript
import EmailService from '../services/EmailService';

describe('EmailService', () => {
  it('should send password reset email', async () => {
    await expect(
      EmailService.sendPasswordResetEmail('test@example.com', 'token123')
    ).resolves.not.toThrow();
  });

  it('should send welcome email', async () => {
    await expect(
      EmailService.sendWelcomeEmail('test@example.com', 'John')
    ).resolves.not.toThrow();
  });

  it('should send account linked email', async () => {
    await expect(
      EmailService.sendAccountLinkedEmail('test@example.com', 'Google')
    ).resolves.not.toThrow();
  });
});
```

## Security Considerations

1. **Token Security**: Reset tokens should be:
   - Cryptographically secure random strings
   - Hashed before storage in database
   - Single-use only
   - Expired after 1 hour

2. **Email Enumeration Prevention**: 
   - Always return success message even if email doesn't exist
   - Don't reveal whether an email is registered

3. **SMTP Credentials**:
   - Never commit SMTP credentials to version control
   - Use environment variables
   - Rotate credentials regularly
   - Use API keys instead of passwords when possible

4. **Rate Limiting**:
   - Implement rate limiting on password reset endpoints
   - Limit to 3 requests per IP per 15 minutes

## Production Checklist

Before deploying to production:

- [ ] Configure production SMTP provider (SendGrid recommended)
- [ ] Set `SMTP_FROM_EMAIL` to verified domain email
- [ ] Set `FRONTEND_URL` to production domain
- [ ] Test email delivery to various providers (Gmail, Outlook, etc.)
- [ ] Verify emails don't land in spam
- [ ] Set up SPF, DKIM, and DMARC records for your domain
- [ ] Monitor email delivery rates
- [ ] Set up bounce and complaint handling
- [ ] Configure email sending limits with your provider

## Troubleshooting

### Emails Not Sending

1. Check environment variables are set correctly
2. Verify SMTP credentials are valid
3. Check SMTP port (587 for TLS, 465 for SSL)
4. Ensure firewall allows outbound SMTP connections
5. Check email provider logs for errors

### Emails Landing in Spam

1. Verify SPF record for your domain
2. Set up DKIM signing
3. Configure DMARC policy
4. Use a verified sender domain
5. Avoid spam trigger words in subject/content
6. Maintain good sender reputation

### Template Issues

1. Test in multiple email clients (Gmail, Outlook, Apple Mail)
2. Use inline CSS (external stylesheets not supported)
3. Keep HTML simple (complex layouts may break)
4. Always include plain text version
5. Test on mobile devices

## Related Services

- **AuthService**: Generates reset tokens and handles authentication
- **TokenService**: Manages JWT tokens (separate from reset tokens)
- **RateLimiter**: Prevents abuse of password reset endpoint

## Requirements

This service implements:
- **Requirement 11.4**: Send password reset email with unique token
- **Requirement 11.8**: Include reset link and 1-hour expiration notice

## Future Enhancements

Potential improvements:
- Email templates from database (dynamic content)
- Multi-language support
- Email analytics and tracking
- Transactional email service integration (e.g., SendGrid templates)
- Email queue for better reliability
- Retry logic for failed sends
- Email verification on registration
