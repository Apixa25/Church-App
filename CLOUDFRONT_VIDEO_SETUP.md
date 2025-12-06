# 🚀 CloudFront Video Delivery Setup Guide

This guide explains how to set up AWS CloudFront CDN for fast video playback in your church app. CloudFront dramatically improves video streaming performance by serving videos from edge locations worldwide.

---

## 🎯 Why CloudFront for Videos?

**Current Issue:** Videos are served directly from S3, causing stuttering and slow playback.

**Solution:** CloudFront CDN provides:
- ✅ **Edge caching** - Videos cached at locations close to users
- ✅ **Faster delivery** - Lower latency worldwide
- ✅ **Better HTTP/2 support** - Improved streaming performance
- ✅ **Optimized range requests** - Better video buffering
- ✅ **Cost effective** - Often cheaper than direct S3 egress

**Industry Standard:** X.com (Twitter), Facebook, Instagram all use CDN for video delivery.

---

## 📋 Prerequisites

- AWS account with S3 bucket already set up
- Videos already uploading to S3 bucket
- Access to AWS Console

---

## 🔧 Step 1: Add Media Bucket to Existing Distribution

**You already have a CloudFront distribution!** (`d3loytcgioxpml.cloudfront.net`)

Instead of creating a new one, we'll add your media bucket as an additional origin. This is simpler and uses your existing distribution.

### **1.1 Navigate to Your Distribution**

1. Go to: https://console.aws.amazon.com/cloudfront/
2. Click on your existing distribution: **`thegathrd-frontend`**
3. Go to the **"Origins"** tab

### **1.2 Add Media Bucket as Origin**

1. Click **"Create origin"**
2. **Origin domain:** 
   - Select or enter: `church-app-uploads-stevensills2.s3.us-west-2.amazonaws.com`
   - Or use the dropdown to find your bucket
3. **Origin path:** Leave empty
4. **Name:** `media-bucket` (or any descriptive name)
5. **Origin access:** 
   - If bucket is public: Select **"Public"**
   - If bucket is private: Select **"Origin access control settings (recommended)"** and create/select an OAC
6. Click **"Create origin"**

### **1.3 Create Behavior for Media Files**

1. Go to the **"Behaviors"** tab
2. Click **"Create behavior"**
3. **Path pattern:** Enter `posts/*` (this will match all files in the posts folder)
4. **Origin and origin groups:** Select your new `media-bucket` origin
5. **Viewer protocol policy:** `Redirect HTTP to HTTPS`
6. **Allowed HTTP methods:** `GET, HEAD, OPTIONS`
7. **Cache policy:** `CachingOptimized` (or create custom for videos - see Step 5)
8. **Origin request policy:** `CORS-S3Origin` (if using CORS)
9. Click **"Create behavior"**

### **1.4 Add More Path Patterns (Optional)**

If you have media in other folders, create additional behaviors:
- **Path pattern:** `chat-media/*` → `media-bucket` origin
- **Path pattern:** `resources/*` → `media-bucket` origin
- **Path pattern:** `worship/*` → `media-bucket` origin

**Note:** CloudFront evaluates behaviors in order (most specific first), so your default behavior (for frontend) will still work for everything else.

### **1.5 Save Changes**

1. Click **"Save changes"** at the top
2. Wait 5-15 minutes for changes to deploy
3. **Your distribution domain:** `d3loytcgioxpml.cloudfront.net` (already set up!)

---

## 🔄 Alternative: Create Separate Distribution (Optional)

If you prefer a separate distribution for media files:

### **1.1 Navigate to CloudFront Console**

1. Go to: https://console.aws.amazon.com/cloudfront/
2. Click **"Create distribution"**

### **1.2 Configure Origin**

1. **Origin domain:** Select your media S3 bucket
   - `church-app-uploads-stevensills2.s3.us-west-2.amazonaws.com`
2. **Origin path:** Leave empty
3. **Name:** Auto-generated (or customize to `thegathrd-media`)

### **1.3 Configure Default Cache Behavior**

**Settings:**
- **Viewer protocol policy:** `Redirect HTTP to HTTPS`
- **Allowed HTTP methods:** `GET, HEAD, OPTIONS`
- **Cache policy:** `CachingOptimized` (or create custom for videos)
- **Origin request policy:** `CORS-S3Origin` (if using CORS)

### **1.4 Configure Distribution Settings**

**Settings:**
- **Price class:** `Use all edge locations` (best performance) - you already have this on your frontend distribution!
- **Alternate domain names (CNAMEs):** Leave empty (or use `media.thegathrd.com` if you want)
- **SSL certificate:** `Default CloudFront certificate` (or your custom certificate)
- **Default root object:** Leave empty

### **1.5 Create Distribution**

1. Click **"Create distribution"**
2. Wait 5-15 minutes for distribution to deploy
3. **Save the Distribution Domain Name** (e.g., `d9876543210.cloudfront.net`)

---

## 🔧 Step 2: Configure S3 Bucket Permissions

### **2.1 Update Bucket Policy (if needed)**

Your S3 bucket needs to allow CloudFront to access files. If your bucket is already public, this should work. If not, you may need to:

1. Go to S3 Console → Your bucket → Permissions
2. Ensure bucket policy allows CloudFront access
3. Or use Origin Access Control (OAC) for private buckets

### **2.2 Configure CORS (if needed)**

If you're using CORS for video requests:

1. Go to S3 Console → Your bucket → Permissions → CORS
2. Ensure CORS configuration allows your frontend domain

---

## 🔧 Step 3: Configure Backend Environment Variable

### **3.1 Add CloudFront URL to Elastic Beanstalk**

1. Go to AWS Console → Elastic Beanstalk
2. Select your environment (e.g., `church-app-api-prod`)
3. Go to **Configuration** → **Software** → **Edit**
4. Add new environment variable:
   - **Name:** `AWS_CLOUDFRONT_DISTRIBUTION_URL`
   - **Value:** `https://d3loytcgioxpml.cloudfront.net` (your existing distribution domain)
5. Click **Apply**
6. Wait for environment update (2-5 minutes)

### **3.2 Verify Configuration**

The backend will automatically use CloudFront URLs if this environment variable is set. If not set, it falls back to direct S3 URLs.

**Important:** Since you're using the same distribution for both frontend and media, the URLs will be:
- Frontend: `https://d3loytcgioxpml.cloudfront.net/` (serves React app)
- Media: `https://d3loytcgioxpml.cloudfront.net/posts/originals/...` (serves videos/images)

This works perfectly because CloudFront routes based on path patterns!

---

## 🔧 Step 4: Test Video Playback

### **4.1 Upload a Test Video**

1. Upload a video through your app
2. Check the video URL in the response
3. URL should now be: `https://d1234567890.cloudfront.net/posts/originals/...`

### **4.2 Test Playback**

1. Play the video in your app
2. Should see:
   - ✅ Faster initial load
   - ✅ Smoother playback
   - ✅ Less buffering
   - ✅ Better performance on mobile

### **4.3 Monitor CloudFront**

1. Go to CloudFront Console → Your distribution
2. Check **Metrics** tab:
   - **Requests** - Should show video requests
   - **Data transferred** - Should show video data
   - **Cache hit rate** - Should increase over time

---

## 🔧 Step 5: Optimize Cache Settings (Optional)

### **5.1 Create Custom Cache Policy for Videos**

For better video caching:

1. Go to CloudFront Console → **Policies** → **Cache policies**
2. Click **"Create cache policy"**
3. **Name:** `VideoCachePolicy`
4. **Settings:**
   - **TTL:** `86400` (1 day) for videos
   - **Enable compression:** Yes
   - **Query strings:** None
   - **Headers:** Include `Origin` and `Access-Control-Request-Headers`
5. Click **"Create"**

### **5.2 Apply to Distribution**

1. Go to your distribution → **Behaviors** tab
2. Edit default behavior (or create path pattern for videos)
3. Select your custom cache policy
4. Save changes

---

## 📊 Monitoring & Costs

### **CloudFront Pricing (Approximate)**

- **Data transfer out:** ~$0.085/GB (first 10TB/month)
- **HTTP/HTTPS requests:** ~$0.0075 per 10,000 requests
- **Free tier:** 1TB data transfer and 10M requests/month (first 12 months)

### **Cost Comparison**

- **Direct S3:** ~$0.09/GB egress
- **CloudFront:** ~$0.085/GB + better performance
- **Result:** Often cheaper AND faster!

### **Monitoring**

1. **CloudWatch Metrics:**
   - Requests
   - Data transferred
   - Cache hit rate
   - Error rate

2. **Alarms:**
   - Set up billing alerts
   - Monitor error rates

---

## 🚨 Troubleshooting

### **Issue: Videos still slow**

**Solutions:**
1. Verify `AWS_CLOUDFRONT_DISTRIBUTION_URL` is set correctly
2. Check CloudFront distribution is deployed (Status = "Deployed")
3. Clear browser cache and test again
4. Check CloudFront metrics to see if requests are hitting CDN

### **Issue: 403 Forbidden errors**

**Solutions:**
1. Check S3 bucket permissions allow CloudFront access
2. Verify CORS configuration
3. Check CloudFront origin settings

### **Issue: Videos not updating**

**Solutions:**
1. CloudFront caches videos - may take time to see updates
2. Create CloudFront invalidation for specific video paths
3. Or wait for cache TTL to expire

### **Issue: CORS errors**

**Solutions:**
1. Update S3 CORS configuration
2. Configure CloudFront to forward Origin header
3. Check browser console for specific CORS errors

---

## ✅ Success Checklist

- [ ] CloudFront distribution created and deployed
- [ ] Distribution domain name saved
- [ ] `AWS_CLOUDFRONT_DISTRIBUTION_URL` set in Elastic Beanstalk
- [ ] Test video uploaded and URL shows CloudFront domain
- [ ] Video playback is smooth and fast
- [ ] CloudFront metrics showing requests

---

## 🎉 Next Steps

After CloudFront is set up:

1. **Monitor performance** - Check CloudFront metrics regularly
2. **Optimize cache** - Adjust cache policies based on usage
3. **Consider HLS/DASH** - For even better adaptive streaming (future enhancement)

---

## 📚 Additional Resources

- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [CloudFront Best Practices](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/best-practices.html)
- [CloudFront Pricing](https://aws.amazon.com/cloudfront/pricing/)

---

**Remember:** CloudFront distribution deployment takes 5-15 minutes. Be patient! 🚀

