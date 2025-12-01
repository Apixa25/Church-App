# 🎯 Manual Nginx Fix via SSH - Simple & Reliable

## ✅ Why This Approach

- ✅ **No deployment issues** - Deploy just the JAR, no config files
- ✅ **One-time setup** - Do it once, works forever
- ✅ **Simple command** - Just add one line to nginx config
- ✅ **Immediate** - Takes 2 minutes, works right away
- ✅ **No hanging** - Nothing that can timeout

---

## 🚨 Step 1: Abort Current Deployment

1. **Actions** → **"Abort Current Operation"**
2. Wait 3-5 minutes for it to complete

---

## ✅ Step 2: Deploy Just the JAR (No Config Files)

Once environment is stable:

1. **Upload and deploy**
2. Select: `backend\target\church-app-backend-0.0.1-SNAPSHOT.jar` (just the JAR, no ZIP)
3. **Version label:** `clean-jar-only`
4. Click **"Deploy"**
5. Wait for it to complete successfully

---

## 🔧 Step 3: Connect to Instance via SSH

### Option A: Using AWS Systems Manager (Easiest - No Key Pair Needed!)

1. **Go to:** AWS Console → **EC2** → **Instances**
2. **Find:** Your Elastic Beanstalk instance (name will include your environment name)
3. **Select** the instance
4. Click **"Connect"** button (top right)
5. Select **"Session Manager"** tab
6. Click **"Connect"**
7. A browser-based terminal will open! 🎉

### Option B: Using SSH (If You Have Key Pair)

1. **Go to:** Elastic Beanstalk → Your environment → **Configuration** → **Security**
2. Note the **EC2 key pair** name
3. **SSH command** (from your local machine):
   ```bash
   ssh -i your-key.pem ec2-user@[INSTANCE_IP]
   ```
   - Get instance IP from EC2 Console → Instances

---

## 📝 Step 4: Add Nginx Configuration (One Command!)

Once connected to the instance, run this **single command**:

```bash
echo "client_max_body_size 100M;" | sudo tee -a /etc/nginx/conf.d/proxy.conf
```

**That's it!** This adds the upload size limit to nginx.

---

## 🔄 Step 5: Restart Nginx

```bash
sudo systemctl restart nginx
```

---

## ✅ Step 6: Verify It Worked

```bash
# Check the config was added
cat /etc/nginx/conf.d/proxy.conf

# Should show: client_max_body_size 100M;
```

---

## 🧪 Step 7: Test Upload

1. Go to https://www.thegathrd.com
2. Try uploading a file larger than 1MB
3. Should work now! 🎉

---

## 🎯 Why This Works

- **No deployment complexity** - Just SSH in and add one line
- **Permanent** - The config file persists even after deployments
- **Simple** - One command, done in 2 minutes
- **Reliable** - No hanging, no timeouts, no deployment issues

---

## 📝 Important Notes

- **This is a one-time setup** - Once done, you never need to do it again
- **Future deployments** - Just deploy JAR files normally, nginx config stays
- **If instance is replaced** - You'd need to do this again (rare, only if instance fails)

---

## 🆘 If You Can't SSH

If SSH access isn't enabled:

1. **Go to:** Elastic Beanstalk → Configuration → Security
2. **Enable SSH** - Add an EC2 key pair
3. **Or use Systems Manager** - No key pair needed!

---

**This is the simplest, most reliable way!** No more deployment headaches! 🎯

