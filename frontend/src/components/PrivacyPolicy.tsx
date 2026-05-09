import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LegalPage.css';

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <div className="legal-header">
        <button className="legal-back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>Privacy Policy</h1>
        <p className="legal-effective-date">Effective Date: May 8, 2026</p>
      </div>

      <div className="legal-content">
        <section>
          <h2>1. Introduction</h2>
          <p>
            The Gathering ("we," "our," or "us") is a church community platform operated by
            Steven Sills II. This Privacy Policy explains how we collect, use, disclose,
            and safeguard your information when you use our mobile application and website
            (collectively, the "Service").
          </p>
          <p>
            By using the Service, you agree to the collection and use of information in
            accordance with this policy.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>

          <h3>2.1 Information You Provide</h3>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, password, and profile picture when you register.</li>
            <li><strong>Profile Information:</strong> Bio, location, and other optional profile details.</li>
            <li><strong>User Content:</strong> Posts, comments, prayer requests, chat messages, photos, and videos you share.</li>
            <li><strong>Donation Information:</strong> Payment details processed securely through Stripe (we do not store your full credit card number).</li>
            <li><strong>Communications:</strong> Messages sent through our chat features.</li>
          </ul>

          <h3>2.2 Information Collected Automatically</h3>
          <ul>
            <li><strong>Device Information:</strong> Device type, operating system, and browser type.</li>
            <li><strong>Usage Data:</strong> Pages visited, features used, and interaction patterns.</li>
            <li><strong>Location Data:</strong> Approximate location when you grant location permission (used for community discovery and events).</li>
            <li><strong>Push Notification Tokens:</strong> Device tokens for sending you notifications.</li>
          </ul>

          <h3>2.3 Camera and Microphone</h3>
          <p>
            We request camera and microphone access only when you choose to take photos or
            record videos within the app. This media is uploaded to our secure servers and
            shared only as you direct.
          </p>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>Provide, maintain, and improve the Service</li>
            <li>Send you notifications about community activity, events, and prayer requests</li>
            <li>Process donations securely through Stripe</li>
            <li>Connect you with church communities and groups</li>
            <li>Ensure platform safety through content moderation</li>
            <li>Respond to your inquiries and support requests</li>
          </ul>
        </section>

        <section>
          <h2>4. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul>
            <li><strong>Google Authentication:</strong> For secure sign-in via your Google account.</li>
            <li><strong>Apple Authentication:</strong> For secure sign-in via your Apple ID.</li>
            <li><strong>Firebase Cloud Messaging:</strong> For delivering push notifications.</li>
            <li><strong>Stripe:</strong> For processing donations securely.</li>
            <li><strong>Amazon Web Services (AWS):</strong> For secure data storage and media hosting.</li>
          </ul>
          <p>
            Each of these services has its own privacy policy governing the use of your information.
          </p>
        </section>

        <section>
          <h2>5. Data Sharing and Disclosure</h2>
          <p>We do not sell your personal information. We may share information:</p>
          <ul>
            <li>With other users as directed by you (posts, messages, profile information)</li>
            <li>With church/organization administrators for community management</li>
            <li>With service providers who assist in operating the Service</li>
            <li>When required by law or to protect our legal rights</li>
            <li>In connection with a merger, acquisition, or sale of assets (with notice to you)</li>
          </ul>
        </section>

        <section>
          <h2>6. Data Security</h2>
          <p>
            We implement industry-standard security measures including encryption in transit
            (HTTPS/TLS), secure authentication tokens, and access controls. However, no
            method of electronic transmission or storage is 100% secure.
          </p>
        </section>

        <section>
          <h2>7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong>Correction:</strong> Update or correct your personal information through your profile settings.</li>
            <li><strong>Deletion:</strong> Request deletion of your account and associated data.</li>
            <li><strong>Opt-out:</strong> Disable push notifications through app settings or your device settings.</li>
            <li><strong>Data Portability:</strong> Request your data in a portable format.</li>
          </ul>
        </section>

        <section>
          <h2>8. Children's Privacy</h2>
          <p>
            The Service is not intended for children under the age of 13. We do not
            knowingly collect personal information from children under 13. If we learn that
            we have collected information from a child under 13, we will promptly delete it.
          </p>
        </section>

        <section>
          <h2>9. Data Retention</h2>
          <p>
            We retain your information for as long as your account is active or as needed to
            provide the Service. You may request deletion of your account at any time. After
            account deletion, we may retain certain information as required by law or for
            legitimate business purposes.
          </p>
        </section>

        <section>
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of
            material changes through the app or by email. Continued use of the Service
            after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2>11. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or your personal data, please
            contact us at:
          </p>
          <p className="legal-contact">
            <strong>The Gathering</strong><br />
            Email: privacy@thegathrd.com
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
