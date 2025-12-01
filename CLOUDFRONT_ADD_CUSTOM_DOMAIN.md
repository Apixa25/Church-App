# ⚙️ Step 1: Add www.thegathrd.com to CloudFront

## 🎯 Goal

Add `www.thegathrd.com` as an alternate domain name (CNAME) to your CloudFront distribution and associate the SSL certificate.

---

## 📋 Step-by-Step Instructions

### **Step 1.1: Navigate to CloudFront**

1. **Go to:** AWS Console → https://console.aws.amazon.com/
2. **Make sure you're in:** `us-west-2` region (or any region, CloudFront is global)
3. **Search:** "CloudFront" in the search bar
4. **Click:** "CloudFront" service

### **Step 1.2: Select Your Distribution**

1. **Find distribution:** `E2SM4EXV57KO8B`
   - **Domain:** `d3loytcgioxpml.cloudfront.net`
2. **Click on the distribution ID** to open it

### **Step 1.3: Check Current Configuration**

1. **Click:** "General" tab (should be selected by default)
2. **Scroll down** to "Settings" section
3. **Look for:** "Alternate domain names (CNAMEs)"
   - **If you see:** `www.thegathrd.com` already listed → ✅ **You're done! Skip to Step 2**
   - **If you see:** Empty or other domains → Continue to Step 1.4

### **Step 1.4: Edit Distribution Settings**

1. **Click:** Blue **"Edit"** button (top right of the Settings card)
2. **Scroll down** to find "Alternate domain names (CNAMEs)" section

### **Step 1.5: Add Custom Domain**

1. **In "Alternate domain names (CNAMEs)":**
   - **Click:** "Add item" button (or the text field if empty)
   - **Enter:** `www.thegathrd.com`
   - **Press Enter** or click outside the field

2. **Scroll down** to "Custom SSL certificate" section

### **Step 1.6: Associate SSL Certificate**

1. **Find:** "Custom SSL certificate" dropdown
2. **Click:** The dropdown
3. **Select:** `*.thegathrd.com` (your wildcard certificate)
   - Should show something like: `*.thegathrd.com (a662a418-f25d-4c11-8389-31447daefda2)`
   - ⚠️ **If you don't see the certificate:**
     - It might be in `us-east-1` region (CloudFront requires certificates in us-east-1)
     - Go to Certificate Manager in `us-east-1` and verify it's validated

### **Step 1.7: Save Changes**

1. **Scroll to bottom** of the page
2. **Click:** Blue **"Save changes"** button
3. **Wait:** You'll see a confirmation message
4. **Status will change:** From "Deployed" to "Updating..." (takes 5-15 minutes)

---

## ✅ Verification

After saving:

1. **Go back to:** "General" tab
2. **Check:** "Alternate domain names (CNAMEs)" should now show:
   - `www.thegathrd.com` ✅
3. **Check:** "Custom SSL certificate" should show:
   - `*.thegathrd.com` ✅

---

## ⏱️ Wait Time

- **CloudFront update:** 5-15 minutes
- **Status will show:** "Updating..." → "Deployed" when ready
- **You can continue** with other steps while waiting (DNS, environment variables)

---

## 🎯 Next Steps

After CloudFront is updated:

1. ✅ **Step 2:** Update `FRONTEND_URL` in Elastic Beanstalk
2. ✅ **Step 3:** Verify Google OAuth settings
3. ✅ **Step 4:** Add DNS record in GoDaddy
4. ✅ **Step 5:** Test everything!

---

## ⚠️ Troubleshooting

### Issue: Certificate not showing in dropdown
- **Solution:** Certificate must be in `us-east-1` region for CloudFront
- **Check:** Go to Certificate Manager → Switch to `us-east-1` → Verify certificate is validated

### Issue: "Invalid domain name" error
- **Solution:** Make sure you enter `www.thegathrd.com` (no `https://`, no trailing slash)

### Issue: Distribution stuck on "Updating..."
- **Solution:** This is normal, can take up to 15 minutes. Just wait!

---

**Ready to proceed? Follow the steps above!** 🚀

