# 🔧 CloudFront CORS Configuration Guide

## 🎯 Issue Summary

When using `crossOrigin="anonymous"` on `<img>` tags, browsers require CORS headers from the server. If CloudFront doesn't send these headers, images will be blocked with CORS errors.

## ✅ Solution Applied

**Removed `crossOrigin="anonymous"` from `ClickableAvatar.tsx`** - This attribute is only needed when manipulating images with JavaScript (e.g., drawing to canvas). For regular image display, it's unnecessary and causes CORS issues.

## 📋 When You DO Need CORS (Future Reference)

If you need to use images in canvas or manipulate them with JavaScript, you'll need to configure CloudFront to send CORS headers.

### Step 1: Configure S3 Bucket CORS

1. Go to AWS S3 Console → Your bucket (`church-app-uploads-stevensills2`)
2. Navigate to **Permissions** → **CORS**
3. Add this CORS configuration:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "HEAD"
        ],
        "AllowedOrigins": [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://thegathrd.com",
            "https://www.thegathrd.com"
        ],
        "ExposeHeaders": [
            "ETag",
            "Content-Length",
            "Content-Type"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

### Step 2: Configure CloudFront Response Headers Policy

1. Go to AWS CloudFront Console
2. Navigate to **Policies** → **Response headers policies**
3. Click **Create response headers policy**
4. Name: `CORS-Headers-Policy`
5. Configure:
   - **CORS settings**: Enable
   - **Access-Control-Allow-Origin**: 
     - For development: `http://localhost:3000`
     - For production: `https://thegathrd.com`
     - Or use: `*` (less secure, allows all origins)
   - **Access-Control-Allow-Methods**: `GET, HEAD, OPTIONS`
   - **Access-Control-Allow-Headers**: `*`
   - **Access-Control-Max-Age**: `3000`

### Step 3: Apply Policy to CloudFront Behavior

1. Go to your CloudFront distribution (`d3loytcgioxpml.cloudfront.net`)
2. Navigate to **Behaviors** tab
3. Edit the behavior that handles media files (or create one for `profile-pictures/*` and `banner-images/*`)
4. Set **Response headers policy** to your new `CORS-Headers-Policy`
5. Click **Save changes**
6. Wait 5-15 minutes for deployment

### Step 4: Update Cache Policy (Optional)

If you're using a custom cache policy:
1. Go to **Policies** → **Cache policies**
2. Edit your cache policy
3. Ensure **Headers** includes:
   - `Origin` (forward to origin)
   - `Access-Control-Request-Headers` (forward to origin)
   - `Access-Control-Request-Method` (forward to origin)

## 🔍 Testing CORS Configuration

After configuration, test with:

```javascript
// In browser console
fetch('https://d3loytcgioxpml.cloudfront.net/profile-pictures/originals/test.jpg', {
  method: 'HEAD',
  mode: 'cors'
})
.then(response => {
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
})
.catch(err => console.error('CORS Error:', err));
```

## 📝 Notes

- **Regular `<img>` tags don't need CORS** - Only use `crossOrigin="anonymous"` when manipulating images with JavaScript
- **Current fix**: Removed `crossOrigin` from `ClickableAvatar.tsx` since profile images are just displayed
- **Future**: If you need canvas manipulation, follow the steps above to configure CloudFront CORS

## 🎯 Industry Standard

Most platforms (X.com, Facebook, Instagram) serve images without requiring CORS for display. CORS is only needed for:
- Canvas manipulation
- Fetch API requests
- WebGL textures
- Image processing in JavaScript

For simple image display, CORS is unnecessary and can cause issues.

