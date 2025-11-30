# 🔧 GoDaddy DNS Setup for api.thegathrd.com

## ✅ Load Balancer DNS Name

```
awseb--AWSEB-qgvbyUvUVD1R-1132196320.us-west-2.elb.amazonaws.com
```

---

## 📋 Step 1: Add CNAME Record in GoDaddy

1. **Go to:** GoDaddy.com → **My Products**
2. **Find:** `thegathrd.com` domain
3. **Click:** **DNS** (or **Manage DNS**)
4. **Click:** **Add** (to add a new record)
5. **Configure CNAME Record:**
   - **Type:** CNAME
   - **Name:** `api`
   - **Value:** `awseb--AWSEB-qgvbyUvUVD1R-1132196320.us-west-2.elb.amazonaws.com`
   - **TTL:** 600 (or 1 hour)
6. **Click:** **Save**

**✅ DNS Record Created!**

---

## ⏳ Step 2: Wait for DNS Propagation

- **Time:** 5-15 minutes (usually faster)
- **Test DNS:**
  ```powershell
  nslookup api.thegathrd.com
  ```
- **Expected:** Should return `awseb--AWSEB-qgvbyUvUVD1R-1132196320.us-west-2.elb.amazonaws.com`

---

## 🔒 Step 3: Request SSL Certificate

### **3.1 Request Certificate in us-west-2**

**⚠️ IMPORTANT:** Certificate must be in **us-west-2** region!

1. **Go to:** AWS Console → **Certificate Manager**
2. **Check region:** Top right should show **us-west-2** (Oregon)
   - If not, click and change to **us-west-2**
3. **Click:** **Request certificate**
4. **Certificate type:** Public certificate
5. **Domain name:** `api.thegathrd.com`
6. **Validation method:** DNS validation
7. **Click:** **Request**

### **3.2 Validate Certificate**

1. **Copy the CNAME record** from Certificate Manager
2. **Go to:** GoDaddy DNS
3. **Add the CNAME record** for validation
   - **Type:** CNAME
   - **Name:** `_xxxxx.api.thegathrd.com` (from ACM)
   - **Value:** `_xxxxx.xxxxx.acm-validations.aws.` (from ACM)
4. **Click:** **Save**
5. **Wait:** 5-30 minutes for validation

---

## 🔒 Step 4: Add HTTPS Listener

Once certificate is validated:

1. **On the Load Balancer page** (where you are now)
2. **Click:** **"Add listener"** button
3. **Configure:**
   - **Protocol:** HTTPS
   - **Port:** 443
   - **Default SSL/TLS certificate:** 
     - Select **"From ACM (recommended)"**
     - Choose: `api.thegathrd.com` (must be in us-west-2)
   - **Default action:** Forward to target group
     - **Target group:** `awseb-AWSEB-QLJAM1BDKUJQ` (this is your current target group)
     - **Weight:** 1 (100%)
4. **Click:** **Add listener**

**✅ HTTPS Listener Added!**

---

## 🔄 Step 5: Update Frontend

Once DNS and HTTPS are working, we'll update the frontend API URL to:
```
https://api.thegathrd.com/api
```

---

**Let's start with Step 1 - Add the CNAME record in GoDaddy!** 🚀

