# ✅ Validate SSL Certificate for api.thegathrd.com

## 📋 Certificate Details

**Certificate ID:** `9a820618-ad0c-4c14-bd36-5516e4d4c412`  
**Domain:** `api.thegathrd.com`  
**Status:** Pending validation  
**Region:** us-west-2 ✅

---

## 🔧 Step 1: Add CNAME Validation Record to GoDaddy

You need to add a CNAME record to validate the certificate. Here's what to add:

### **CNAME Record Details:**

1. **Go to:** GoDaddy.com → **My Products** → **DNS Management** for `thegathrd.com`

2. **Click:** **Add** (to add a new record)

3. **Configure CNAME Record:**
   - **Type:** CNAME
   - **Name:** `_c90a7ec399c1d3365957c8e763e501ca.api`
     - ⚠️ **Important:** Just `_c90a7ec399c1d3365957c8e763e501ca.api` (NOT the full domain)
   - **Value:** `_cef32bef1ed1ee9fa4dd6447524178ed.jkddzztszi.validations.aws.`
     - ⚠️ **Important:** Include the trailing dot (`.`) at the end!
   - **TTL:** 600 (or 1 hour)
   
4. **Click:** **Save**

---

## ⏳ Step 2: Wait for Validation

- **Time:** 5-30 minutes (usually 5-10 minutes)
- **Check status:** Refresh the Certificate Manager page
- **Status will change:** "Pending validation" → "Issued" ✅

---

## ✅ Step 3: Verify Validation

1. **Go back to:** Certificate Manager
2. **Refresh the page**
3. **Check status:** Should show "Issued" (green checkmark)
4. **Domain status:** Should show "Success" ✅

---

## 🎯 What This Does

This CNAME record proves to AWS that you own the `api.thegathrd.com` domain, allowing AWS to issue the SSL certificate.

---

## 📝 Quick Reference

**CNAME Name:** `_c90a7ec399c1d3365957c8e763e501ca.api`  
**CNAME Value:** `_cef32bef1ed1ee9fa4dd6447524178ed.jkddzztszi.validations.aws.`  
**Domain:** `api.thegathrd.com`

---

**Add this CNAME record to GoDaddy DNS now!** 🚀

