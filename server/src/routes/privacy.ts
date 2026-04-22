import { Router } from 'express';

const router = Router();

const PRIVACY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy – Muster</title>
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
  <h1>Privacy Policy</h1>
  <p><strong>Effective date:</strong> April 22, 2026</p>

  <p>Muster ("we", "our", or "us") operates the Muster mobile application. This policy explains what data we collect, how we use it, and your rights.</p>

  <h2>Information We Collect</h2>
  <ul>
    <li><strong>Account data:</strong> name, email address, username, and password (stored as a hash).</li>
    <li><strong>Profile data:</strong> profile photo, sport preferences, skill level, and age bracket.</li>
    <li><strong>Location:</strong> approximate location when you use the app to find nearby facilities or events. We do not track your location in the background.</li>
    <li><strong>Payment data:</strong> payments are processed by Stripe. We do not store card numbers. We store a record of transaction IDs and amounts for booking history.</li>
    <li><strong>Communications:</strong> messages sent through the in-app messaging system.</li>
    <li><strong>Device data:</strong> push notification token, device type, and operating system version for delivering notifications.</li>
    <li><strong>Usage data:</strong> events you join, teams you manage, bookings you make, and ratings you give or receive.</li>
    <li><strong>Dependents:</strong> if you add a dependent (e.g. a child), we store their name and sport preferences linked to your account.</li>
  </ul>

  <h2>How We Use Your Information</h2>
  <ul>
    <li>To operate the app — create and manage your account, bookings, teams, and events.</li>
    <li>To process payments via Stripe and transfer funds to facility owners.</li>
    <li>To send push notifications about bookings, events, and messages you have opted into.</li>
    <li>To show you nearby facilities and events relevant to your location.</li>
    <li>To calculate player ratings based on salutes received from other players.</li>
    <li>To communicate service updates and support responses.</li>
  </ul>

  <h2>Sharing Your Information</h2>
  <p>We do not sell your personal data. We share data only with:</p>
  <ul>
    <li><strong>Stripe</strong> — for payment processing.</li>
    <li><strong>Expo</strong> — for delivering push notifications.</li>
    <li><strong>Other users</strong> — your name, profile photo, and player rating are visible to other users in events and teams you participate in.</li>
    <li><strong>Facility owners</strong> — when you book a facility, the owner sees your name and contact info for the booking.</li>
  </ul>

  <h2>Data Retention</h2>
  <p>We retain your account data for as long as your account is active. You may request deletion of your account and associated data by contacting us. Payment records may be retained for up to 7 years for legal and tax compliance.</p>

  <h2>Your Rights</h2>
  <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us at <a href="mailto:support@playmuster.com">support@playmuster.com</a>.</p>

  <h2>Children's Privacy</h2>
  <p>The app is not directed to children under 13. Dependent profiles linked to a parent account are managed by and visible only to that parent.</p>

  <h2>Changes to This Policy</h2>
  <p>We may update this policy from time to time. We will notify you of material changes via the app or email.</p>

  <h2>Contact</h2>
  <p>Questions? Email us at <a href="mailto:support@playmuster.com">support@playmuster.com</a>.</p>
</body>
</html>`;

router.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(PRIVACY_HTML);
});

export default router;
