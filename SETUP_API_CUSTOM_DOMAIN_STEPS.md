# 🌐 Set Up Custom Domain: api.thegathrd.com

## 🎯 Goal

Configure `api.thegathrd.com` to point to your Elastic Beanstalk backend with HTTPS.

---

## 📋 Step 1: Get Elastic Beanstalk Load Balancer DNS Name

### **Option A: From Elastic Beanstalk Console**

1. **Go to:** AWS Console → **Elastic Beanstalk**
2. **Select:** Your environment (`church-app-backend-prod`)
3. **Go to:** **Configuration** tab (left sidebar)
4. **Scroll to:** **Load balancer** section
5. **Find:** **Load balancer DNS name**
   - Should look like: `awseb-xxx-123456789.us-west-2.elb.amazonaws.com`
6. **Copy this DNS name** - you'll need it for GoDaddy DNS

### **Option B: From EC2 Console**

1. **Go to:** AWS Console → **EC2** → **Load Balancers**
2. **Find:** Load balancer with name containing `awseb-` or your environment name
3. **Click on it** to view details
4. **Copy:** The **DNS name** from the details page

---

## 🔧 Step 2: Configure DNS in GoDaddy

1. **Go to:** GoDaddy.com → **My Products**
2. **Find:** `thegathrd.com` domain
3. **Click:** **DNS** (or **Manage DNS**)
4. **Click:** **Add** (to add a new record)
5. **Configure CNAME Record:**
   - **Type:** CNAME
   - **Name:** `api`
   - **Value:** `[Paste your Elastic Beanstalk Load Balancer DNS name]`
     - Example: `awseb-xxx-123456789.us-west-2.elb.amazonaws.com`
   - **TTL:** 600 (or 1 hour)
6. **Click:** **Save**

**✅ DNS Record Created!**

---

## ⏳ Step 3: Wait for DNS Propagation

- **Time:** 5-15 minutes (usually faster)
- **Check:** Use `nslookup` to verify:
  ```powershell
  nslookup api.thegathrd.com
  ```
- **Expected:** Should return your Elastic Beanstalk load balancer DNS name

---

## 🔒 Step 4: Request SSL Certificate for api.thegathrd.com

### **4.1 Request Certificate in us-west-2**

**Important:** The certificate must be in **us-west-2** (same region as your load balancer)!

1. **Go to:** AWS Console → **Certificate Manager**
2. **Make sure you're in:** **us-west-2** region (top right)
3. **Click:** **Request certificate**
4. **Certificate type:** Public certificate
5. **Domain name:** `api.thegathrd.com`
6. **Validation method:** DNS validation
7. **Click:** **Request**

### **4.2 Validate Certificate**

1. **Copy the CNAME record** from Certificate Manager
2. **Go to:** GoDaddy DNS
3. **Add the CNAME record** for validation
4. **Wait:** 5-30 minutes for validation

---

## 🔒 Step 5: Configure HTTPS on Load Balancer

Once the certificate is validated:

1. **Go to:** EC2 Console → **Load Balancers**
2. **Select:** Your Elastic Beanstalk load balancer
3. **Go to:** **Listeners** tab
4. **Click:** **Add listener**
5. **Configure:**
   - **Protocol:** HTTPS
   - **Port:** 443
   - **Default SSL/TLS certificate:** 
     - Select **"From ACM (recommended)"**
     - Choose: `api.thegathrd.com` (must be in us-west-2)
   - **Default action:** Forward to target group
     - **Target group:** Select your Elastic Beanstalk target group
       - Usually named like `awseb-xxx-xxx` or similar
6. **Click:** **Add listener**

**✅ HTTPS Listener Added!**

---

## 🔄 Step 6: Update Frontend API URL

Once DNS and HTTPS are working:

1. **Update `.env.production`:**
   ```
   REACT_APP_API_URL=https://api.thegathrd.com/api
   ```

2. **Rebuild and redeploy frontend**

---

## 🧪 Step 7: Test Everything

1. **Test DNS:**
   ```powershell
   nslookup api.thegathrd.com
   ```

2. **Test HTTPS:**
   - Open: `https://api.thegathrd.com/api/actuator/health`
   - Should return: `{"status":"UP"}`

3. **Test Frontend:**
   - Clear browser cache
   - Try registering/logging in
   - Should work! 🎉

---

## 📝 Quick Reference

**Custom Domain:** `api.thegathrd.com`  
**Target:** Elastic Beanstalk Load Balancer DNS  
**Certificate Region:** **us-west-2** (must match load balancer region)  
**Frontend API URL:** `https://api.thegathrd.com/api`

---

**Let's start with Step 1!** 🚀

