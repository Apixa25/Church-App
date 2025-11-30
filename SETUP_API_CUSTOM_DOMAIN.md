# 🌐 Set Up Custom Domain: api.thegathrd.com

## 🎯 Goal

Configure `api.thegathrd.com` to point to your Elastic Beanstalk backend with HTTPS support.

---

## 📋 Step 1: Get Elastic Beanstalk Load Balancer DNS Name

1. **Go to:** AWS Console → **EC2** → **Load Balancers**
2. **Find:** Your Elastic Beanstalk load balancer (name starts with `awseb-`)
3. **Copy:** The **DNS name** (looks like: `awseb-xxx-123456789.us-west-2.elb.amazonaws.com`)

**OR** get it from Elastic Beanstalk:
1. **Go to:** AWS Console → **Elastic Beanstalk**
2. **Select:** Your environment (`church-app-backend-prod`)
3. **Go to:** Configuration → **Load balancer**
4. **Copy:** The **DNS name** or **Endpoint**

---

## 🔧 Step 2: Configure DNS in GoDaddy

1. **Go to:** GoDaddy → **My Products** → **DNS Management** for `thegathrd.com`

2. **Add CNAME Record:**
   - **Type:** CNAME
   - **Name:** `api`
   - **Value:** `[Your Elastic Beanstalk Load Balancer DNS Name]`
     - Example: `awseb-xxx-123456789.us-west-2.elb.amazonaws.com`
   - **TTL:** 600 (or default)
   - **Click:** Save

3. **Wait:** 5-15 minutes for DNS propagation

---

## ✅ Step 3: Verify DNS Propagation

After a few minutes, test DNS:

```powershell
nslookup api.thegathrd.com
```

You should see the Elastic Beanstalk load balancer DNS name.

---

## 🔒 Step 4: Configure HTTPS on Load Balancer

Once DNS is working, configure HTTPS:

1. **Go to:** EC2 Console → **Load Balancers**
2. **Select:** Your Elastic Beanstalk load balancer
3. **Go to:** Listeners tab
4. **Click:** "Add listener"
5. **Configure:**
   - **Protocol:** HTTPS
   - **Port:** 443
   - **Default SSL/TLS certificate:** Select `*.thegathrd.com` from ACM
     - **Note:** Certificate must be in **us-west-2** region
     - If not available, request a new one in us-west-2
6. **Default action:** Forward to target group
   - **Target group:** Select your Elastic Beanstalk target group
7. **Click:** "Add listener"

---

## 🔄 Step 5: Update Frontend API URL

Once HTTPS is configured and DNS is working:

1. **Update `.env.production`:**
   ```
   REACT_APP_API_URL=https://api.thegathrd.com/api
   ```

2. **Rebuild and redeploy frontend**

---

## 🧪 Step 6: Test

1. **Test DNS:** `nslookup api.thegathrd.com`
2. **Test HTTPS:** `https://api.thegathrd.com/api/actuator/health`
3. **Test frontend:** Try registering/logging in

---

## 📝 Quick Reference

**Custom Domain:** `api.thegathrd.com`  
**Target:** Elastic Beanstalk Load Balancer DNS  
**Certificate:** `*.thegathrd.com` (must be in us-west-2)  
**Frontend API URL:** `https://api.thegathrd.com/api`

---

**Let's get started!** 🚀

