# 🔒 Add HTTPS Listener to Load Balancer

## ✅ Certificate Status

**Certificate:** `api.thegathrd.com`  
**Status:** **Issued** ✅  
**Region:** us-west-2 ✅

---

## 🔧 Step 1: Add HTTPS Listener

1. **Go to:** EC2 Console → **Load Balancers**
2. **Select:** `awseb--AWSEB-qgvbyUvUVD1R`
3. **Go to:** **Listeners and rules** tab
4. **Click:** **"Add listener"** button
5. **Configure:**
   - **Protocol:** HTTPS
   - **Port:** 443
   - **Default SSL/TLS certificate:** 
     - Select **"From ACM (recommended)"**
     - Choose: `api.thegathrd.com` (should now be available in the dropdown)
   - **Default action:** Forward to target group
     - **Target group:** `awseb-AWSEB-QLJAM1BDKUJQ` (your current target group)
     - **Weight:** 1 (100%)
6. **Click:** **Add listener**

**✅ HTTPS Listener Added!**

---

## 🧪 Step 2: Test HTTPS

After adding the listener, test:

1. **Open:** `https://api.thegathrd.com/api/actuator/health`
2. **Expected:** Should return `{"status":"UP"}` with a valid SSL certificate

---

## 🔄 Step 3: Update Frontend

Once HTTPS is working, we'll update the frontend to use:
```
https://api.thegathrd.com/api
```

---

**Add the HTTPS listener now, then let me know when it's done!** 🚀

