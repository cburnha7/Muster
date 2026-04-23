import { Router } from 'express';

const router = Router();

const TERMS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Terms of Service – Muster</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 720px;
      margin: 0 auto;
      padding: 40px 24px;
      color: #1a1a1a;
      line-height: 1.7;
    }
    h1 { font-size: 28px; margin-bottom: 4px; }
    h2 { font-size: 18px; margin-top: 36px; }
    p, li { font-size: 15px; color: #333; }
    a { color: #0052FF; }
  </style>
</head>
<body>
  <h1>Terms of Service</h1>
  <p><strong>Effective date:</strong> April 23, 2026</p>

  <p>Welcome to Muster. By creating an account or using the Muster mobile application ("the App"), you agree to these Terms of Service ("Terms"). If you do not agree, do not use the App.</p>

  <h2>1. Acceptance of Terms</h2>
  <p>By accessing or using Muster, you confirm that you are at least 13 years of age and agree to be bound by these Terms and our <a href="/privacy">Privacy Policy</a>. If you are using the App on behalf of a minor as a guardian, you accept these Terms on their behalf.</p>

  <h2>2. Account Registration</h2>
  <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your login credentials and for all activity under your account. Notify us immediately at <a href="mailto:support@playmuster.com">support@playmuster.com</a> if you suspect unauthorized access.</p>

  <h2>3. User Conduct</h2>
  <p>You agree not to:</p>
  <ul>
    <li>Harass, threaten, or abuse other users.</li>
    <li>Create fraudulent bookings or misrepresent your identity.</li>
    <li>Interfere with the operation of the App or its infrastructure.</li>
    <li>Use the App for any unlawful purpose.</li>
    <li>Scrape, crawl, or collect data from the App without permission.</li>
    <li>Circumvent any access controls or security measures.</li>
  </ul>
  <p>We reserve the right to suspend or terminate accounts that violate these rules.</p>

  <h2>4. Payments</h2>
  <p>All payments are processed by Stripe. Muster does not store your credit card information. By making a payment through the App, you agree to Stripe's <a href="https://stripe.com/legal">Terms of Service</a>.</p>
  <p>A platform fee is applied to each transaction. The fee rate is disclosed before you confirm a booking.</p>
  <p>If you believe a charge is incorrect, contact us at <a href="mailto:support@playmuster.com">support@playmuster.com</a> before initiating a chargeback with your bank. Chargebacks filed without first contacting Muster support may result in account suspension.</p>

  <h2>5. Bookings and Cancellations</h2>
  <p>Facility bookings are subject to the cancellation policy set by each facility owner. The applicable cancellation policy is displayed before you confirm a booking and is recorded on your booking receipt.</p>
  <p>Cancellations within the facility's cancellation window may require facility owner approval. Refund amounts are determined by the facility's policy at the time of booking.</p>

  <h2>6. Facility Owners</h2>
  <p>If you list a facility on Muster, you are responsible for the accuracy of your listing, availability, and pricing. You agree to honor confirmed bookings and to process cancellations in accordance with your stated policy.</p>

  <h2>7. Content</h2>
  <p>You retain ownership of content you upload (profile photos, messages, etc.). By uploading content, you grant Muster a non-exclusive, worldwide license to display that content within the App for the purpose of operating the service.</p>
  <p>We may remove content that violates these Terms or is reported by other users.</p>

  <h2>8. Account Termination</h2>
  <p>You may delete your account at any time from the Settings screen or by contacting us. We may suspend or terminate your account if you violate these Terms, with or without notice.</p>
  <p>Upon termination, your right to use the App ceases immediately. Data deletion is handled in accordance with our <a href="/privacy">Privacy Policy</a>.</p>

  <h2>9. Disclaimer of Warranties</h2>
  <p>The App is provided "as is" and "as available" without warranties of any kind, express or implied. We do not guarantee that the App will be uninterrupted, error-free, or free of harmful components.</p>

  <h2>10. Limitation of Liability</h2>
  <p>To the maximum extent permitted by law, Muster and its officers, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App, including but not limited to loss of revenue, data, or goodwill.</p>
  <p>Our total liability for any claim arising from these Terms or your use of the App shall not exceed the amount you paid to Muster in the 12 months preceding the claim.</p>

  <h2>11. Indemnification</h2>
  <p>You agree to indemnify and hold harmless Muster from any claims, damages, or expenses arising from your use of the App or violation of these Terms.</p>

  <h2>12. Governing Law</h2>
  <p>These Terms are governed by the laws of the State of Texas, without regard to conflict of law principles. Any disputes shall be resolved in the courts located in Travis County, Texas.</p>

  <h2>13. Changes to These Terms</h2>
  <p>We may update these Terms from time to time. We will notify you of material changes via the App or email. Continued use of the App after changes constitutes acceptance of the updated Terms.</p>

  <h2>14. Contact</h2>
  <p>Questions about these Terms? Email us at <a href="mailto:support@playmuster.com">support@playmuster.com</a>.</p>
</body>
</html>`;

router.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(TERMS_HTML);
});

export default router;
