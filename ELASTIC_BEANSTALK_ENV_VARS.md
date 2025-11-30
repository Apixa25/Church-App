# 🔐 Elastic Beanstalk Environment Variables

Copy and paste these environment variables into Elastic Beanstalk Configuration → Software → Environment properties.

---

## 📋 Required Environment Variables

### **Database Configuration**
```
DB_URL=jdbc:postgresql://church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com:5432/church_app
DB_HOST=church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com
DB_PORT=5432
DB_NAME=church_app
DB_USER=church_user
DB_PASSWORD=Z.jS~w]fvv[W-TyYhB8TlTD_fEG2
```

### **Spring Profile**
```
SPRING_PROFILES_ACTIVE=production
```

### **JWT Secret** (Generate a strong secret!)
```
JWT_SECRET=[GENERATE_STRONG_SECRET_32_CHARS_MIN]
```

**To generate a JWT secret in PowerShell:**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### **AWS Configuration**
```
AWS_REGION=us-west-2
AWS_S3_BUCKET=thegathrd-app-uploads
AWS_ACCESS_KEY_ID=[YOUR_AWS_ACCESS_KEY]
AWS_SECRET_ACCESS_KEY=[YOUR_AWS_SECRET_KEY]
```

**Note:** Get these from your AWS CLI configuration or IAM user.

### **CORS Configuration**
```
CORS_ORIGINS=https://www.thegathrd.com,https://app.thegathrd.com,https://thegathrd.com
```

---

## 📋 Optional Environment Variables (Add When Ready)

### **Google OAuth** (If you have credentials)
```
GOOGLE_CLIENT_ID=[YOUR_GOOGLE_CLIENT_ID]
GOOGLE_CLIENT_SECRET=[YOUR_GOOGLE_CLIENT_SECRET]
```

### **Stripe** (If you have keys)
```
STRIPE_PUBLIC_KEY=[YOUR_STRIPE_PUBLIC_KEY]
STRIPE_SECRET_KEY=[YOUR_STRIPE_SECRET_KEY]
STRIPE_WEBHOOK_SECRET=[YOUR_WEBHOOK_SECRET]
```

### **Email/SMTP** (If configured)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=[YOUR_EMAIL]
SMTP_PASSWORD=[YOUR_APP_PASSWORD]
```

### **Church Information** (Update with real values)
```
CHURCH_NAME=The Gathering Community
CHURCH_ADDRESS=[YOUR_ADDRESS]
CHURCH_PHONE=[YOUR_PHONE]
CHURCH_EMAIL=info@thegathrd.com
CHURCH_WEBSITE=www.thegathrd.com
CHURCH_TAX_ID=[YOUR_TAX_ID]
```

---

## 📝 How to Add Variables

1. Go to **Elastic Beanstalk Console** → Your environment (`Church-app-backend-prod`)
2. Click **"Configuration"** tab
3. Scroll to **"Software"** section
4. Click **"Edit"** button
5. Scroll to **"Environment properties"**
6. Click **"Add environment property"** for each variable
7. Enter **Name** and **Value**
8. Click **"Apply"** at the bottom (takes 2-3 minutes to update)

---

## ✅ Minimum Required for First Deployment

At minimum, add these to get started:
- `DB_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `SPRING_PROFILES_ACTIVE`
- `JWT_SECRET`
- `AWS_REGION`
- `CORS_ORIGINS`

You can add the optional ones later!

---

**Ready to add these?** Let's configure them now! 🚀

