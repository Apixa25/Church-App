# 🔐 Validate SSL Certificate - Step by Step

Your SSL certificate is requested! Now we need to validate it by adding DNS records to GoDaddy.

---

## 📋 Current Status

- ✅ Certificate requested: `a662a418-f25d-4c11-8389-31447daefda2`
- ⏳ Status: **Pending validation**
- ⏭️ Next: Add DNS records to GoDaddy

---

## 🚀 Step 1: Get DNS Validation Records

### **1.1 In AWS Certificate Manager**

1. **Click on your certificate** (the one with ID `a662a418-f25d-4c11-8389-31447daefda2`)
2. **Scroll down to:** "Domains" section
3. **You'll see:** Two domains listed:
   - `*.thegathrd.com`
   - `thegathrd.com`

### **1.2 Get CNAME Records**

For each domain, you'll see:
- **Name:** (CNAME record name)
- **Value:** (CNAME record value)

**Example format:**
```
Name: _abc123.thegathrd.com
Value: _xyz789.acm-validations.aws.
```

**You need to copy BOTH sets of CNAME records** (one for wildcard, one for root domain).

---

## 🌐 Step 2: Add CNAME Records to GoDaddy

### **2.1 Go to GoDaddy DNS Management**

1. **Go to:** https://www.godaddy.com/
2. **Sign in** to your account
3. **Go to:** "My Products"
4. **Find:** `thegathrd.com` domain
5. **Click:** "DNS" or "Manage DNS"

### **2.2 Add CNAME Records**

1. **Click:** "Add" or "+" button to add a new record
2. **For each CNAME record from AWS:**

   **Record 1 (for wildcard domain):**
   - **Type:** CNAME
   - **Name:** Copy from AWS (e.g., `_abc123.thegathrd.com` or just `_abc123`)
   - **Value:** Copy from AWS (e.g., `_xyz789.acm-validations.aws.`)
   - **TTL:** 600 (or default)
   - **Click:** "Save"

   **Record 2 (for root domain):**
   - **Type:** CNAME
   - **Name:** Copy from AWS (e.g., `_def456.thegathrd.com` or just `_def456`)
   - **Value:** Copy from AWS (e.g., `_uvw012.acm-validations.aws.`)
   - **TTL:** 600 (or default)
   - **Click:** "Save"

### **2.3 Important Notes**

- **Include the trailing dot** in the Value (e.g., `_xyz789.acm-validations.aws.`)
- **Name field:** You might need to include the full domain or just the prefix (GoDaddy will add the domain automatically)
- **Wait:** DNS propagation can take 5-30 minutes

---

## ⏳ Step 3: Wait for Validation

1. **Go back to:** AWS Certificate Manager
2. **Refresh the page** after 5-10 minutes
3. **Check status:** Should change from "Pending validation" to "Issued"

**Validation typically takes:**
- **5-15 minutes** if DNS is configured correctly
- **Up to 30 minutes** in some cases

---

## ✅ Step 4: Verify Certificate is Validated

Once validated, you'll see:
- **Status:** "Issued" (green checkmark)
- **Ready to use** in CloudFront!

---

## 🎯 What's Next?

After certificate is validated:
1. ✅ **Create CloudFront distribution**
2. ✅ **Attach SSL certificate** to CloudFront
3. ✅ **Update S3 bucket policy**
4. ✅ **Build and deploy frontend**

---

## 🆘 Troubleshooting

### **Validation taking too long**
- Double-check CNAME records are correct
- Make sure you included the trailing dot in values
- Wait up to 30 minutes

### **Validation failed**
- Check CNAME records are correct
- Make sure records are saved in GoDaddy
- Verify domain ownership

### **Can't find CNAME records in AWS**
- Click on your certificate
- Scroll to "Domains" section
- Expand each domain to see validation records

---

## 📝 Quick Reference

**Certificate ID:** `a662a418-f25d-4c11-8389-31447daefda2`  
**Region:** `us-east-1` (required for CloudFront)  
**Domains:** `*.thegathrd.com` and `thegathrd.com`  
**Status:** Pending validation → Waiting for DNS records

---

**Once validated, we'll create the CloudFront distribution!** 🚀

---

**Last Updated:** [Current Date]
**Status:** Waiting for DNS Validation

