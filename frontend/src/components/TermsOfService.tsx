import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LegalPage.css';

const TermsOfService: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <div className="legal-header">
        <button className="legal-back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>Terms of Service</h1>
        <p className="legal-effective-date">Effective Date: May 8, 2026</p>
      </div>

      <div className="legal-content">
        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using The Gathering application and website (the "Service"),
            you agree to be bound by these Terms of Service ("Terms"). If you do not agree
            to these Terms, please do not use the Service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            The Gathering is a multi-tenant church community platform that provides features
            including social feeds, messaging, prayer request sharing, event management,
            group collaboration, worship rooms, donations, and community resources. The
            Service is designed to strengthen church community bonds.
          </p>
        </section>

        <section>
          <h2>3. Eligibility</h2>
          <p>
            You must be at least 13 years of age to use the Service. If you are under 18,
            you represent that you have your parent or guardian's permission to use the
            Service. By using the Service, you represent and warrant that you meet these
            requirements.
          </p>
        </section>

        <section>
          <h2>4. User Accounts</h2>
          <ul>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You agree to provide accurate and complete information when creating your account.</li>
            <li>You are responsible for all activities that occur under your account.</li>
            <li>You must notify us immediately of any unauthorized use of your account.</li>
          </ul>
        </section>

        <section>
          <h2>5. User Content</h2>
          <h3>5.1 Your Content</h3>
          <p>
            You retain ownership of content you post, share, or upload to the Service
            ("User Content"). By posting User Content, you grant us a non-exclusive,
            worldwide, royalty-free license to use, display, and distribute your content
            solely for the purpose of operating and providing the Service.
          </p>

          <h3>5.2 Content Standards</h3>
          <p>You agree not to post content that:</p>
          <ul>
            <li>Is unlawful, harassing, threatening, or defamatory</li>
            <li>Infringes on the intellectual property rights of others</li>
            <li>Contains malware, spam, or phishing attempts</li>
            <li>Impersonates another person or entity</li>
            <li>Is sexually explicit or promotes violence</li>
            <li>Violates any applicable law or regulation</li>
          </ul>

          <h3>5.3 Content Moderation</h3>
          <p>
            We reserve the right to review, remove, or disable access to any User Content
            that violates these Terms or is otherwise objectionable. Users may report
            content or other users through the reporting features provided in the app.
          </p>
        </section>

        <section>
          <h2>6. Community Guidelines</h2>
          <p>
            The Gathering is built on the values of respect, kindness, and positive
            community building. Users are expected to:
          </p>
          <ul>
            <li>Treat all community members with respect and dignity</li>
            <li>Respect the privacy of others, especially regarding prayer requests</li>
            <li>Use the messaging features responsibly</li>
            <li>Report inappropriate content or behavior</li>
            <li>Respect the leadership structure of church organizations</li>
          </ul>
        </section>

        <section>
          <h2>7. Donations</h2>
          <p>
            Donations made through the Service are processed by Stripe, a third-party
            payment processor. By making a donation:
          </p>
          <ul>
            <li>You acknowledge that donations go directly to the designated church or organization.</li>
            <li>The Gathering platform does not retain any portion of donations.</li>
            <li>Refund policies are determined by the receiving organization.</li>
            <li>You are responsible for any applicable tax implications of your donations.</li>
          </ul>
        </section>

        <section>
          <h2>8. Privacy</h2>
          <p>
            Your use of the Service is also governed by our{' '}
            <a href="/privacy-policy">Privacy Policy</a>, which describes how we collect,
            use, and share your information.
          </p>
        </section>

        <section>
          <h2>9. Intellectual Property</h2>
          <p>
            The Service and its original content (excluding User Content), features, and
            functionality are owned by The Gathering and are protected by copyright,
            trademark, and other intellectual property laws.
          </p>
        </section>

        <section>
          <h2>10. Termination</h2>
          <p>
            We may terminate or suspend your account and access to the Service at our sole
            discretion, without prior notice, for conduct that we believe violates these
            Terms or is harmful to other users, us, or third parties, or for any other
            reason.
          </p>
          <p>
            You may delete your account at any time through the app settings.
          </p>
        </section>

        <section>
          <h2>11. Disclaimers</h2>
          <p>
            The Service is provided "as is" and "as available" without warranties of any
            kind, either express or implied. We do not warrant that the Service will be
            uninterrupted, secure, or error-free.
          </p>
        </section>

        <section>
          <h2>12. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, The Gathering and its operators shall
            not be liable for any indirect, incidental, special, consequential, or punitive
            damages arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2>13. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will provide notice
            of material changes through the app or by other means. Your continued use of
            the Service after changes constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2>14. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of
            the State of California, without regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2>15. Contact Us</h2>
          <p>
            If you have questions about these Terms, please contact us at:
          </p>
          <p className="legal-contact">
            <strong>The Gathering</strong><br />
            Email: support@thegathrd.com
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
