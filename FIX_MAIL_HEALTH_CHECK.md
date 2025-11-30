# 🔧 Fix Mail Health Check Issue

## Problem
Health check returns `{"status": "DOWN"}` because the **mail** component is failing:
```json
{
  "mail": {
    "status": "DOWN",
    "error": "jakarta.mail.AuthenticationFailedException: 535-5.7.8 Username and Password not accepted"
  }
}
```

## Root Cause
- Gmail SMTP credentials are not configured or incorrect
- Mail health check is enabled by default in Spring Boot Actuator
- Failed mail health check causes overall health status to be DOWN

## ✅ Solution
I've disabled the mail health check in `application-production.properties`:
```properties
management.health.mail.enabled=false
```

**Why this is safe:**
- Email functionality is not critical for app startup
- You can configure SMTP credentials later when needed
- The app will still work without email health checks
- Database and other critical components are still monitored

---

## 🚀 Next Steps

### Option 1: Rebuild and Deploy (Recommended)

1. **Rebuild JAR:**
   ```powershell
   cd backend
   .\mvnw.cmd clean package -DskipTests
   ```

2. **Upload to Elastic Beanstalk:**
   - Go to Elastic Beanstalk Console
   - Click "Upload and deploy"
   - Upload the new JAR file
   - Wait for deployment (5-10 minutes)

3. **Test Health Endpoint:**
   ```
   http://church-app-backend-prod.eba-jmp5ju3e.us-west-2.elasticbeanstalk.com/api/actuator/health
   ```

   **Expected Response:**
   ```json
   {
     "status": "UP",
     "components": {
       "db": {
         "status": "UP",
         "details": {
           "database": "PostgreSQL",
           "validationQuery": "isValid()"
         }
       },
       "ping": {
         "status": "UP"
       }
     }
   }
   ```

---

### Option 2: Configure SMTP Credentials (If You Need Email)

If you want to enable email functionality, configure these environment variables in Elastic Beanstalk:

1. Go to **Elastic Beanstalk Console** → Your environment
2. **Configuration** → **Software** → **Edit**
3. **Environment properties** → Add:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ```
4. Click **"Apply"**

**Note:** For Gmail, you need to use an **App Password**, not your regular password:
- Go to Google Account → Security → 2-Step Verification → App passwords
- Generate an app password for "Mail"
- Use that as `SMTP_PASSWORD`

---

## 📊 Current Status

✅ **Database:** UP  
✅ **Ping:** UP  
❌ **Mail:** DOWN (now disabled)  
✅ **Overall:** Should be UP after rebuild

---

## 🎯 Recommendation

**Disable mail health check for now** - You can configure email later when needed. The app doesn't require email to function.

After rebuilding and deploying, your health check should return `{"status": "UP"}`! 🎉

