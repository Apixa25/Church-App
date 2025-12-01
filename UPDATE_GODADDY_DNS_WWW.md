# 🔧 Update GoDaddy DNS: www CNAME Record

## 🔍 Current Configuration

You have a CNAME record:
- **Type:** CNAME
- **Name:** `www`
- **Value:** `thegathrd.com.` ❌ (Wrong - points to root domain)
- **TTL:** 1 Hour

## ✅ What It Should Be

- **Type:** CNAME
- **Name:** `www`
- **Value:** `d3loytcgioxpml.cloudfront.net` ✅ (Points to CloudFront)
- **TTL:** 1 Hour (or default)

---

## 📋 Step-by-Step: Update the CNAME Record

### **Step 1: Edit the Record**

1. **In GoDaddy DNS Management:**
   - Find the row with `www` CNAME record
   - **Click the pencil icon** (edit button) on the right

### **Step 2: Update the Value**

1. **In the edit dialog:**
   - **Find:** "Points to" or "Value" field
   - **Current value:** `thegathrd.com.` (or `thegathrd.com`)
   - **Change to:** `d3loytcgioxpml.cloudfront.net`
   - ⚠️ **Important:** 
     - No `https://` prefix
     - No trailing period (`.`)
     - Just the CloudFront domain: `d3loytcgioxpml.cloudfront.net`

### **Step 3: Save**

1. **Click:** "Save" or "Update" button
2. **Wait:** 5-30 minutes for DNS propagation

---

## ✅ After Updating

The record should look like:
- **Type:** CNAME
- **Name:** `www`
- **Value:** `d3loytcgioxpml.cloudfront.net` ✅
- **TTL:** 1 Hour

---

## 🧪 Verify DNS Update

After saving, wait 5-10 minutes, then test:

```powershell
nslookup www.thegathrd.com
```

**Expected output:**
```
Name:    d3loytcgioxpml.cloudfront.net
Addresses: [CloudFront IP addresses]
```

---

## ⚠️ Important Notes

1. **Remove trailing period:** CloudFront domain should NOT have a trailing period (`.`)
2. **No https://:** Just the domain name, no protocol
3. **DNS Propagation:** Can take 5-30 minutes (sometimes up to 48 hours)
4. **CloudFront must be ready:** Make sure you've completed Step 1 (added `www.thegathrd.com` to CloudFront alternate domain names)

---

## 🎯 Summary

**Change:**
- **From:** `thegathrd.com.` (or `thegathrd.com`)
- **To:** `d3loytcgioxpml.cloudfront.net`

This will make `www.thegathrd.com` point to your CloudFront distribution! 🚀


