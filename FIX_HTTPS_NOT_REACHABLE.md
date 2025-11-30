# 🔧 Fix "Not Reachable" HTTPS Listener

## ⚠️ Problem

HTTPS listener (port 443) shows **"Not reachable"** warning.

**This usually means:** The security group is blocking inbound traffic on port 443.

---

## ✅ Solution: Add Security Group Rule

### **Step 1: Find Load Balancer Security Group**

1. **Go to:** EC2 Console → **Load Balancers**
2. **Select:** `awseb--AWSEB-qgvbyUvUVD1R`
3. **Go to:** **Security** tab
4. **Find:** Security group(s) listed
5. **Click on the security group** (or note the name/ID)

### **Step 2: Add Inbound Rule for HTTPS**

1. **Go to:** EC2 Console → **Security Groups**
2. **Select:** The security group from Step 1
3. **Go to:** **Inbound rules** tab
4. **Click:** **"Edit inbound rules"**
5. **Click:** **"Add rule"**
6. **Configure:**
   - **Type:** HTTPS
   - **Protocol:** TCP
   - **Port range:** 443
   - **Source:** 0.0.0.0/0 (or Custom → 0.0.0.0/0)
   - **Description:** "Allow HTTPS from internet"
7. **Click:** **"Save rules"**

### **Step 3: Verify**

1. **Go back to:** Load Balancer → **Listeners and rules** tab
2. **Refresh the page**
3. **Check:** HTTPS:443 listener should no longer show "Not reachable"
4. **Wait:** 1-2 minutes for changes to propagate

---

## 🧪 Step 4: Test HTTPS

After adding the security group rule:

1. **Open:** `https://api.thegathrd.com/api/actuator/health`
2. **Expected:** Should work with valid SSL certificate ✅

---

## 📝 Quick Checklist

- [ ] Security group allows inbound HTTPS (port 443)
- [ ] Source: 0.0.0.0/0 (allows from internet)
- [ ] Security group is attached to load balancer
- [ ] Waited 1-2 minutes after adding rule
- [ ] "Not reachable" warning is gone

---

**Add the security group rule now!** 🔒

