# 🔐 Environment Variables Reference

This document lists all environment variables required for production deployment of the Church App.

---

## 📋 Environment Variables Checklist

### **✅ Required for Production**
- [ ] Database Configuration
- [ ] JWT Secret
- [ ] Google OAuth
- [ ] AWS S3
- [ ] Stripe (when ready)
- [ ] Email/SMTP
- [ ] Church Information
- [ ] CORS Configuration
- [ ] Server Configuration

---

## 🗄️ Database Configuration

```bash
# RDS PostgreSQL Connection
DB_URL=jdbc:postgresql://your-rds-endpoint.region.rds.amazonaws.com:5432/church_app
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=church_app
DB_USER=church_user
DB_PASSWORD=your_secure_database_password_here
```

**Notes:**
- Get `DB_HOST` from RDS console after creating instance
- Use strong password (minimum 16 characters, mixed case, numbers, symbols)
- Store password securely (AWS Secrets Manager recommended)

---

## 🔑 JWT Configuration

```bash
# JWT Secret Key (MUST be changed from default)
JWT_SECRET=your-256-bit-secret-key-minimum-32-characters-long-use-random-generator
```

**Generation:**
```bash
# Generate secure random secret (Linux/Mac)
openssl rand -base64 32

# Or use online generator: https://www.random.org/strings/
```

**Security:**
- Minimum 32 characters
- Use cryptographically secure random generator
- Never commit to Git
- Rotate periodically

---

## 🔐 Google OAuth 2.0

```bash
# Google OAuth Credentials (Production)
GOOGLE_CLIENT_ID=your-production-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-production-google-client-secret
```

**Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `https://api.thegathrd.com/api/oauth2/callback/google`
4. Copy Client ID and Secret

---

## ☁️ AWS S3 Configuration

```bash
# AWS Credentials (IAM User)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=thegathrd-app-uploads
```

**Setup:**
1. Create IAM user with S3 access
2. Attach policy: `AmazonS3FullAccess` (or custom policy)
3. Generate access keys
4. Create S3 bucket for uploads
5. Configure bucket CORS policy

**S3 Bucket CORS Policy:**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": [
      "https://www.thegathrd.com",
      "https://app.thegathrd.com",
      "https://api.thegathrd.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

---

## 💳 Stripe Configuration

```bash
# Stripe API Keys (Start with Test, switch to Live when ready)
STRIPE_PUBLIC_KEY=pk_test_your_test_public_key_here
STRIPE_SECRET_KEY=sk_test_your_test_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**For Production (when ready):**
```bash
STRIPE_PUBLIC_KEY=pk_live_your_live_public_key_here
STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret_here
```

**Setup:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Get API keys from Developers → API keys
3. Set up webhook endpoint: `https://api.thegathrd.com/api/stripe/webhook`
4. Copy webhook signing secret

---

## 📧 Email/SMTP Configuration

```bash
# SMTP Server Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
```

**Gmail Setup:**
1. Enable 2-factor authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use app password (not regular password)

**Alternative Providers:**
- SendGrid: `smtp.sendgrid.net` (port 587)
- AWS SES: Use AWS SES SMTP credentials
- Mailgun: Use Mailgun SMTP settings

---

## 🏛️ Church Information

```bash
# Church Details (for receipts and communications)
CHURCH_NAME=The Gathering Community
CHURCH_ADDRESS=123 Main Street, City, State 12345
CHURCH_PHONE=(555) 123-4567
CHURCH_EMAIL=info@thegathrd.com
CHURCH_WEBSITE=www.thegathrd.com
CHURCH_TAX_ID=00-0000000
```

**Notes:**
- Used in donation receipts
- Update with actual church information
- Tax ID format: EIN format (XX-XXXXXXX)

---

## 🌐 CORS Configuration

```bash
# Allowed Origins (comma-separated)
CORS_ORIGINS=https://www.thegathrd.com,https://app.thegathrd.com,https://thegathrd.com
```

**Production Origins:**
- `https://www.thegathrd.com` (main domain)
- `https://app.thegathrd.com` (app subdomain)
- `https://thegathrd.com` (root domain)

**Development (keep for testing):**
- `http://localhost:3000`
- `http://localhost:8100`
- `capacitor://localhost`

---

## 🖥️ Server Configuration

```bash
# Server Port (Elastic Beanstalk will override, but good to set)
PORT=8083

# Server Context Path
SERVER_CONTEXT_PATH=/api
```

**Notes:**
- Elastic Beanstalk typically uses port 5000 or 8080
- Application will auto-detect from environment
- Context path is `/api` (configured in application.properties)

---

## 🔄 Google OAuth Redirect URI

**Update in Google Cloud Console:**
```
https://api.thegathrd.com/api/oauth2/callback/google
```

**Also update in application.properties:**
```properties
spring.security.oauth2.client.registration.google.redirect-uri=${GOOGLE_REDIRECT_URI:https://api.thegathrd.com/api/oauth2/callback/google}
```

---

## 📝 Environment Variable Template

Create `.env.production` file (DO NOT COMMIT):

```bash
# Database
DB_URL=jdbc:postgresql://your-rds-endpoint.region.rds.amazonaws.com:5432/church_app
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=church_app
DB_USER=church_user
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your-256-bit-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret

# AWS
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=thegathrd-app-uploads

# Stripe
STRIPE_PUBLIC_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Church Info
CHURCH_NAME=The Gathering Community
CHURCH_ADDRESS=Your Address
CHURCH_PHONE=(555) 123-4567
CHURCH_EMAIL=info@thegathrd.com
CHURCH_WEBSITE=www.thegathrd.com
CHURCH_TAX_ID=00-0000000

# CORS
CORS_ORIGINS=https://www.thegathrd.com,https://app.thegathrd.com

# Server
PORT=8083
```

---

## 🔒 Security Best Practices

1. **Never commit `.env` files to Git**
2. **Use AWS Secrets Manager** for sensitive values
3. **Rotate secrets regularly** (every 90 days)
4. **Use IAM roles** instead of access keys when possible
5. **Limit IAM permissions** to minimum required
6. **Enable MFA** on AWS account
7. **Monitor access logs** regularly

---

## 📊 AWS Secrets Manager (Recommended)

Instead of environment variables, use AWS Secrets Manager:

```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name church-app/production/database \
  --secret-string '{"username":"church_user","password":"your-password"}'

# Retrieve in application
aws secretsmanager get-secret-value --secret-id church-app/production/database
```

---

## ✅ Verification Checklist

Before deployment, verify:
- [ ] All required variables are set
- [ ] No default/placeholder values remain
- [ ] Database connection string is correct
- [ ] JWT secret is strong and unique
- [ ] OAuth redirect URIs match production URLs
- [ ] CORS origins include all production domains
- [ ] AWS credentials have correct permissions
- [ ] Stripe keys match environment (test vs live)
- [ ] Email credentials are valid
- [ ] Church information is accurate

---

**Last Updated**: [Current Date]
**Version**: 1.0

