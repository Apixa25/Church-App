# 🔧 Troubleshoot HTTPS Connection Issue

## ⚠️ Problem

`https://api.thegathrd.com/api/actuator/health` shows "This site can't be reached"

---

## 🔍 Troubleshooting Steps

### **Step 1: Check DNS Resolution**

Test if DNS is working:
```powershell
nslookup api.thegathrd.com
```

**Expected:** Should return your load balancer DNS name

---

### **Step 2: Test HTTP (Verify Load Balancer Works)**

Test if the load balancer is accessible via HTTP:
```
http://api.thegathrd.com/api/actuator/health
```

**If HTTP works but HTTPS doesn't:**
- HTTPS listener might not be added
- Or HTTPS listener might not be configured correctly

---

### **Step 3: Verify HTTPS Listener is Added**

1. **Go to:** EC2 Console → **Load Balancers**
2. **Select:** `awseb--AWSEB-qgvbyUvUVD1R`
3. **Go to:** **Listeners and rules** tab
4. **Check:** Do you see **HTTPS:443** listener?

**If HTTPS listener is missing:**
- Add it now (see ADD_HTTPS_LISTENER.md)

**If HTTPS listener exists:**
- Check if certificate is selected
- Check if target group is configured

---

### **Step 4: Check Security Groups**

The load balancer security group must allow:
- **Inbound:** Port 443 (HTTPS) from 0.0.0.0/0

1. **Go to:** EC2 Console → **Security Groups**
2. **Find:** Security group attached to your load balancer
3. **Check Inbound Rules:**
   - Should have rule: Port 443, Protocol TCP, Source 0.0.0.0/0

---

### **Step 5: Check Load Balancer Status**

1. **Go to:** EC2 Console → **Load Balancers**
2. **Select:** Your load balancer
3. **Check Status:** Should be "Active" (green)

---

## 🔧 Common Fixes

### **Fix 1: Add HTTPS Listener**

If HTTPS listener is missing:
1. Go to Load Balancer → Listeners tab
2. Click "Add listener"
3. Protocol: HTTPS, Port: 443
4. Select certificate: `api.thegathrd.com`
5. Forward to target group: `awseb-AWSEB-QLJAM1BDKUJQ`

### **Fix 2: Add Security Group Rule**

If port 443 is blocked:
1. Go to Security Groups
2. Find load balancer security group
3. Add inbound rule:
   - Type: HTTPS
   - Port: 443
   - Source: 0.0.0.0/0

### **Fix 3: Wait for DNS/Listener Propagation**

- DNS changes: 5-15 minutes
- Listener changes: 1-2 minutes
- Try again after waiting

---

## 🧪 Test Commands

**Test DNS:**
```powershell
nslookup api.thegathrd.com
```

**Test HTTP:**
```powershell
Invoke-WebRequest -Uri "http://api.thegathrd.com/api/actuator/health"
```

**Test HTTPS:**
```powershell
Invoke-WebRequest -Uri "https://api.thegathrd.com/api/actuator/health"
```

---

**Let's check these one by one!** 🔍

