# 🧪 Testing CloudFront URL Generation

Quick guide to test that CloudFront URLs are being generated correctly.

---

## ✅ Prerequisites

- [x] CloudFront URL added to `.env` file
- [ ] Backend restarted (to load new env var)
- [ ] Frontend running on `localhost:3000`
- [ ] Backend running on `localhost:8083`

---

## 🎯 Test 1: Upload an Image

### **Steps:**

1. **Go to your app:** `http://localhost:3000`
2. **Create a new post**
3. **Upload an image**
4. **Check the response URL**

### **Expected Result:**

✅ **Should see:** `https://d3loytcgioxpml.cloudfront.net/posts/originals/...`  
❌ **Should NOT see:** `https://church-app-uploads-stevensills2.s3.us-west-2.amazonaws.com/...`

---

## 🎥 Test 2: Upload a Video

### **Steps:**

1. **Create a new post**
2. **Upload a small test video** (under 75MB)
3. **Check the response URL**
4. **Play the video**

### **Expected Results:**

✅ **URL:** Should use CloudFront domain  
✅ **Playback:** Should be smooth (if CloudFront is working)  
✅ **Network tab:** Should show requests to `d3loytcgioxpml.cloudfront.net`

---

## 🔍 Test 3: Check Backend Logs

### **What to Look For:**

When you upload a file, check the backend console output:

✅ **Good:** `Using CloudFront URL: https://d3loytcgioxpml.cloudfront.net/...`  
❌ **Bad:** `Using direct S3 URL (CloudFront not configured): ...`

---

## 🧪 Test 4: Test Presigned URL Endpoint

### **Using Browser Console or Postman:**

```javascript
// In browser console on http://localhost:3000
fetch('http://localhost:8083/api/posts/generate-upload-url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    fileName: 'test-video.mp4',
    contentType: 'video/mp4',
    fileSize: 10485760,  // 10MB
    folder: 'posts'
  })
})
.then(r => r.json())
.then(data => {
  console.log('File URL:', data.fileUrl);
  // Should show CloudFront URL
});
```

---

## ✅ Success Criteria

- [ ] Image uploads return CloudFront URLs
- [ ] Video uploads return CloudFront URLs
- [ ] Backend logs show "Using CloudFront URL"
- [ ] Videos play smoothly
- [ ] No errors in backend logs

---

**Once all tests pass, you're ready to deploy!** 🚀

