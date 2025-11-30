# 🔧 Fix Port Configuration

## Problem
- Application is running on port **8083**
- Elastic Beanstalk/Nginx expects port **5000**
- This causes "Connection refused" errors

---

## Solution: Configure Application Port

Elastic Beanstalk uses environment variable `PORT` to tell your app which port to use.

### Option 1: Use Environment Variable (Recommended)

1. Go to **Elastic Beanstalk Console** → Your environment
2. **Configuration** → **Software** → **Edit**
3. **Environment properties** → Add:
   - **Name:** `PORT`
   - **Value:** `5000`
4. Click **"Apply"**

**Note:** Your application should already read `PORT` from environment. Check `application.properties`:
```properties
server.port=${PORT:8083}
```

This means: Use `PORT` environment variable, or default to 8083.

### Option 2: Update application.properties

If Option 1 doesn't work, we can update the default port in `application.properties` to 5000.

---

## After Fixing Port

1. Wait for configuration update (2-3 minutes)
2. Application will restart on port 5000
3. Nginx will be able to connect
4. Health checks should pass

---

**Status:** Database connection is the main issue - fix that first!

