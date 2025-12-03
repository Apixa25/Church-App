# 🔍 Deployment Failure Analysis - v1.0.9 → v1.0.12

## 📊 Current Status

- **Last Working Version:** v1.0.9
- **Failing Versions:** v1.0.10, v1.0.11, v1.0.12
- **Error Pattern:** Command execution timeout, application not starting
- **Health Status:** Severe - 4 health issues

---

## 🔴 Critical Issues Identified

### Issue 1: MediaConvert Service Startup Failure ⚠️ **LIKELY CAUSE**

**Problem:** The `MediaConvertVideoService.getMediaConvertRoleArn()` method throws an `IllegalStateException` if `AWS_ACCOUNT_ID` is not set:

```java
if (accountId == null || accountId.isEmpty()) {
    String errorMsg = "AWS_ACCOUNT_ID not configured. " +
            "Please set AWS_ACCOUNT_ID in application.properties or as environment variable. " +
            "Alternatively, set AWS_MEDIACONVERT_ROLE_ARN with the full role ARN.";
    log.error(errorMsg);
    throw new IllegalStateException(errorMsg);
}
```

**Impact:** If `AWS_ACCOUNT_ID` is not set in Elastic Beanstalk environment variables, the application will **fail to start** when MediaConvert service is initialized.

**Solution:** 
1. Check if `AWS_ACCOUNT_ID` is set in Elastic Beanstalk environment variables
2. If not, add it: `AWS_ACCOUNT_ID=060163370478`
3. OR set `AWS_MEDIACONVERT_ROLE_ARN` instead

---

### Issue 2: New Dependencies Added

**New Dependencies Since v1.0.9:**
- `com.twelvemonkeys.imageio:imageio-webp:3.12.0` (WebP support)
- `software.amazon.awssdk:mediaconvert:2.21.29` (MediaConvert SDK)

**Potential Issues:**
- Native library dependencies (WebP) might not be available in Elastic Beanstalk environment
- MediaConvert SDK might have initialization issues
- JAR size increased (93.74 MB) - might be hitting limits

---

### Issue 3: Application Startup Sequence

**Components That Initialize at Startup:**
- `S3Config` - Creates MediaConvert client
- `MediaConvertVideoService` - Initialized as `@Service`
- `ImageProcessingService` - Uses WebP library

**Potential Failure Points:**
1. MediaConvert client initialization fails
2. WebP library native dependencies missing
3. Environment variables not set

---

## 🔍 Diagnostic Steps

### Step 1: Check Environment Variables

```powershell
aws elasticbeanstalk describe-configuration-settings \
  --application-name church-app-backend \
  --environment-name church-app-backend-prod \
  --query 'ConfigurationSettings[0].OptionSettings[?Namespace==`aws:elasticbeanstalk:application:environment`]' \
  --output json
```

**Required Variables:**
- `AWS_ACCOUNT_ID=060163370478` ← **CRITICAL**
- `AWS_CLOUDFRONT_DISTRIBUTION_URL=https://d3loytcgioxpml.cloudfront.net`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `DB_URL`, `DB_USER`, `DB_PASSWORD`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### Step 2: Check Application Logs

```powershell
aws elasticbeanstalk request-environment-info \
  --environment-name church-app-backend-prod \
  --info-type tail

# Wait 30 seconds, then:
aws elasticbeanstalk retrieve-environment-info \
  --environment-name church-app-backend-prod \
  --info-type tail \
  --output json
```

**Look for:**
- `IllegalStateException: AWS_ACCOUNT_ID not configured`
- `ClassNotFoundException` (missing dependencies)
- `UnsatisfiedLinkError` (native library issues)
- Database connection errors
- Any startup exceptions

### Step 3: Test JAR Locally

```powershell
cd backend
java -jar target/church-app-backend-0.0.1-SNAPSHOT.jar
```

**Check if:**
- Application starts without errors
- All dependencies load correctly
- No missing environment variable errors

---

## 🛠️ Fix Strategy

### Option A: Make MediaConvert Optional (Recommended)

Modify `MediaConvertVideoService` to not throw exception at startup:

```java
private String getMediaConvertRoleArn() {
    // ... existing code ...
    
    if (accountId == null || accountId.isEmpty()) {
        log.warn("AWS_ACCOUNT_ID not configured. MediaConvert video processing will be disabled.");
        return null; // Don't throw, just disable
    }
    
    // ... rest of code ...
}
```

Then check for null in `startVideoProcessingJob()`:

```java
public String startVideoProcessingJob(...) {
    String roleArn = getMediaConvertRoleArn();
    if (roleArn == null) {
        log.warn("MediaConvert not configured. Skipping video optimization.");
        return null;
    }
    // ... rest of code ...
}
```

### Option B: Set Environment Variable

Add `AWS_ACCOUNT_ID` to Elastic Beanstalk environment variables:

1. Go to Elastic Beanstalk Console
2. Select `church-app-backend-prod` environment
3. Configuration → Software → Environment properties
4. Add: `AWS_ACCOUNT_ID` = `060163370478`
5. Apply changes

### Option C: Use Explicit Role ARN

Instead of `AWS_ACCOUNT_ID`, set `AWS_MEDIACONVERT_ROLE_ARN`:

```
AWS_MEDIACONVERT_ROLE_ARN=arn:aws:iam::060163370478:role/MediaConvert_Default_Role
```

---

## 📋 Testing Checklist

Before deploying again:

- [ ] Verify `AWS_ACCOUNT_ID` is set in Elastic Beanstalk
- [ ] Test JAR locally with production-like environment
- [ ] Check for native library dependencies (WebP)
- [ ] Verify all required environment variables are set
- [ ] Review application logs for startup errors
- [ ] Test MediaConvert service initialization

---

## 🎯 Next Steps

1. **Immediate:** Check if `AWS_ACCOUNT_ID` is set in Elastic Beanstalk
2. **If not set:** Add it and redeploy
3. **If set:** Check application logs for actual error
4. **If still failing:** Make MediaConvert optional (Option A)
5. **Test locally:** Verify JAR starts with production config

---

## 📝 Notes

- JAR size: 93.74 MB (within limits)
- Platform: Corretto 17 on Amazon Linux 2023
- Port: 5000 (configured in .ebextensions)
- Health check: `/api/actuator/health`

