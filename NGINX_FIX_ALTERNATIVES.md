# 🔧 Nginx Fix - Alternative Methods (Session Manager Not Available)

Since Session Manager isn't available, here are **3 alternative approaches** from easiest to most reliable:

---

## 🎯 **Option 1: EC2 Instance Connect (Try This First!)**

EC2 Instance Connect is browser-based and might work even if Session Manager doesn't.

### Steps:
1. **Go to:** EC2 Console → Instances
2. **Select** your Elastic Beanstalk instance
3. **Click:** "Connect" button
4. **Select:** "EC2 Instance Connect" tab (not Session Manager)
5. **Click:** "Connect"
6. **If it works**, you'll get a browser terminal! 🎉

### Then run:
```bash
echo "client_max_body_size 100M;" | sudo tee /etc/nginx/conf.d/proxy.conf && sudo systemctl restart nginx
```

---

## 🔑 **Option 2: SSH Client (If You Have Key Pair)**

If EC2 Instance Connect doesn't work, use SSH with a key pair.

### Step 1: Check if you have a key pair
1. **Go to:** Elastic Beanstalk → Your environment → **Configuration** → **Security**
2. **Look for:** "EC2 key pair" - note the name if it exists

### Step 2A: If you have a key pair
1. **Get instance IP:**
   - EC2 Console → Instances → Your instance → Copy "Public IPv4 address"
2. **SSH from your computer:**
   ```bash
   ssh -i path/to/your-key.pem ec2-user@[INSTANCE_IP]
   ```
3. **Run the command:**
   ```bash
   echo "client_max_body_size 100M;" | sudo tee /etc/nginx/conf.d/proxy.conf && sudo systemctl restart nginx
   ```

### Step 2B: If you DON'T have a key pair
1. **Create one:**
   - EC2 Console → Key Pairs → "Create key pair"
   - Name: `church-app-key`
   - Type: RSA, Format: `.pem`
   - Download the `.pem` file
2. **Add to Elastic Beanstalk:**
   - Elastic Beanstalk → Configuration → Security → Edit
   - EC2 key pair: Select your new key pair
   - Apply (this will take a few minutes)
3. **Then SSH** using Step 2A above

---

## 📦 **Option 3: Super Simple `.platform` Hook (No Commands!)**

This is the **simplest possible automated approach** - just places a file, no commands that can hang.

### What I've Created:
✅ `backend/.platform/nginx/conf.d/proxy.conf` - Just the config file, nothing else!

### How to Deploy:
1. **Abort current deployment** (if stuck)
2. **Create ZIP file** with:
   - Your JAR file
   - The `.platform` directory
3. **Upload and deploy** the ZIP

### Why This Should Work:
- ✅ **No commands** - Just a file that gets placed
- ✅ **No scripts** - Nothing that can timeout
- ✅ **Standard approach** - This is how `.platform` hooks are supposed to work
- ✅ **Minimal** - Just the config, nothing fancy

### Create the ZIP:
```powershell
cd backend
Compress-Archive -Path target\church-app-backend-0.0.1-SNAPSHOT.jar, .platform -DestinationPath deploy-simple.zip
```

Then upload `deploy-simple.zip` to Elastic Beanstalk.

---

## 🎯 **My Recommendation:**

1. **Try Option 1 first** (EC2 Instance Connect) - 2 minutes, browser-based
2. **If that doesn't work, try Option 3** (Simple `.platform` hook) - Should be reliable
3. **If both fail, use Option 2** (SSH with key pair) - Most reliable but requires setup

---

## ✅ **After Any Method Works:**

Test your upload:
1. Go to https://www.thegathrd.com
2. Try uploading a file larger than 1MB
3. Should work! 🎉

---

**The `.platform` hook approach (Option 3) should work this time because it's just a file - no commands, no scripts, nothing that can hang!** 🚀

