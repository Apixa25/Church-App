# 📱 How to Access iPhone Debug Logs

## Method 1: On-Screen Debug Panel (Easiest - No Mac Required) ✅

I've added a **visible debug panel** that appears automatically when you submit a prayer request with an image on iPhone. This shows all the console logs directly on your screen!

### How to Use:
1. **Open the app on your iPhone**
2. **Go to Prayers section**
3. **Click "Submit Prayer Request"**
4. **Select an image** (the 6.7MB one that's failing)
5. **Click "Submit Prayer Request"**
6. **Look for the green debug panel** at the bottom of the screen
7. **Scroll through the logs** to see exactly where it fails
8. **Take a screenshot** of the debug panel and share it with me!

The debug panel shows:
- ✅ When image processing starts
- ✅ File details (name, size, type)
- ✅ API call attempts
- ❌ Exact error messages and details
- ⏱️ Timestamps for each step

**To close the panel:** Click the "✕" button in the top-right corner of the debug panel.

---

## Method 2: Safari Web Inspector (Requires Mac + USB Cable)

If you have a Mac, you can use Safari's Web Inspector for more detailed debugging:

### Setup Steps:

1. **On your iPhone:**
   - Go to **Settings** → **Safari** → **Advanced**
   - Turn on **"Web Inspector"**

2. **On your Mac:**
   - Open **Safari**
   - Go to **Safari** → **Preferences** → **Advanced**
   - Check **"Show Develop menu in menu bar"**

3. **Connect iPhone to Mac:**
   - Use a USB cable to connect your iPhone to your Mac
   - Unlock your iPhone and trust the computer if prompted

4. **Start Debugging:**
   - On your Mac, open Safari
   - Go to **Develop** menu (in Safari menu bar)
   - You should see your iPhone listed
   - Click on your iPhone name → **"thegathrd.com"** (or the app URL)
   - A new window opens with the Web Inspector

5. **View Console Logs:**
   - Click the **"Console"** tab in the Web Inspector
   - All `console.log()`, `console.error()`, etc. will appear here
   - You can filter by log level (Errors, Warnings, Logs)

6. **Test the Prayer Request:**
   - On your iPhone, try submitting the prayer request with the image
   - Watch the console logs in real-time on your Mac
   - Copy the error messages and share them with me

---

## What to Look For in the Logs:

When the prayer request fails instantly, check for:

1. **Image Processing Stage:**
   - `📷 Processing image for upload` - Did this run?
   - `✅ Image processed` or `❌ Image processing failed` - What happened?

2. **File Validation:**
   - `✅ Processed file validated` - Is the file valid?
   - Any errors about "not a File object" or "zero size"?

3. **API Call Stage:**
   - `📤 Preparing to send prayer request with image` - Did this run?
   - `📡 Calling API: createPrayerRequestWithImage` - Did the API call start?
   - `❌ API call failed` - What's the exact error?

4. **Error Details:**
   - `isNetworkError: true/false` - Is it a network issue?
   - `isTimeout: true/false` - Did it timeout?
   - `status: 500/400/etc` - What HTTP status code?
   - `message: "..."` - What's the error message?

---

## Quick Test:

Try submitting the prayer request with the 6.7MB image and:

1. **If using Debug Panel:** Take a screenshot of the green debug panel showing the logs
2. **If using Safari Web Inspector:** Copy the console output and share it

The logs will tell us exactly where the instant failure is happening! 🎯




















