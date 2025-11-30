# 🔒 Add HTTPS Listener - Step by Step

## ✅ Current Status

- ✅ DNS is working (`api.thegathrd.com` resolves correctly)
- ✅ HTTP is working (port 80)
- ✅ Backend is healthy
- ❌ HTTPS is not working (port 443 listener missing)

---

## 🔧 Add HTTPS Listener

### **Step 1: Navigate to Load Balancer**

1. **Go to:** AWS Console → **EC2**
2. **Click:** **Load Balancers** (left sidebar)
3. **Select:** `awseb--AWSEB-qgvbyUvUVD1R`

### **Step 2: Go to Listeners Tab**

1. **Click:** **Listeners and rules** tab
2. **You should see:** Currently only `HTTP:80` listener

### **Step 3: Add HTTPS Listener**

1. **Click:** **"Add listener"** button (top right)
2. **Configure Listener:**
   - **Protocol:** Select **HTTPS** (from dropdown)
   - **Port:** `443` (should auto-fill)
   
3. **Default SSL/TLS certificate:**
   - Select **"From ACM (recommended)"**
   - **Certificate:** Choose `api.thegathrd.com` from dropdown
     - Should show: `api.thegathrd.com (9a820618-ad0c-4c14-bd36-5516e4d4c412)`
   
4. **Default action:**
   - **Action type:** Forward to target group (should be selected)
   - **Target group:** Select `awseb-AWSEB-QLJAM1BDKUJQ`
     - This is your current target group (same one used by HTTP:80)
   - **Weight:** `1` (100%)
   
5. **Click:** **"Add listener"** button (bottom)

### **Step 4: Wait for Listener to Activate**

- **Time:** 1-2 minutes
- **Status:** Will show "Active" when ready

---

## 🧪 Step 5: Test HTTPS

After listener is active:

1. **Open:** `https://api.thegathrd.com/api/actuator/health`
2. **Expected:** Should return `{"status":"UP"}` with valid SSL certificate
3. **Browser:** Should show green lock icon 🔒

---

## 🔒 Step 6: Check Security Group (If Still Not Working)

If HTTPS still doesn't work after adding listener:

1. **Go to:** EC2 Console → **Security Groups**
2. **Find:** Security group attached to your load balancer
3. **Check Inbound Rules:**
   - Should have: **HTTPS (443)** from **0.0.0.0/0**
   - If missing, add it:
     - **Type:** HTTPS
     - **Port:** 443
     - **Source:** 0.0.0.0/0

---

## 📝 Quick Checklist

- [ ] HTTPS listener added (HTTPS:443)
- [ ] Certificate selected: `api.thegathrd.com`
- [ ] Target group: `awseb-AWSEB-QLJAM1BDKUJQ`
- [ ] Listener status: Active
- [ ] Security group allows port 443

---

**Add the HTTPS listener now, then test again!** 🚀

