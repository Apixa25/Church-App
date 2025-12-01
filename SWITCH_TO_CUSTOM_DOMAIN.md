# 🌐 Switch to Custom Domain: www.thegathrd.com

## 🎉 Great News!

OAuth is working! Now let's switch from CloudFront URL to your custom domain.

---

## 📋 Steps to Switch to Custom Domain

### Step 1: Request SSL Certificate for www.thegathrd.com
- Already done? Check AWS Certificate Manager
- Need to request? Request in **us-west-2** region

### Step 2: Update CloudFront Distribution
- Add custom domain to CloudFront distribution
- Associate SSL certificate
- Update alternate domain names (CNAMEs)

### Step 3: Update Environment Variables
- Update `FRONTEND_URL` in Elastic Beanstalk
- Update `CORS_ORIGINS` to include `www.thegathrd.com`
- Update Google OAuth authorized origins

### Step 4: Update DNS Records in GoDaddy
- Add CNAME record pointing `www.thegathrd.com` to CloudFront distribution

### Step 5: Update Frontend Configuration
- Update `.env.production` if needed
- Rebuild and redeploy frontend

### Step 6: Update Google OAuth Settings
- Add `https://www.thegathrd.com` to authorized JavaScript origins
- Update redirect URIs if needed

---

## 🚀 Let's Start!



