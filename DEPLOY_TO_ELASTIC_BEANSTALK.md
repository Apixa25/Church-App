# 🚀 Deploy JAR to Elastic Beanstalk

Your JAR file has been built successfully! Now let's deploy it to Elastic Beanstalk.

---

## ✅ JAR File Built

**Location:** `backend\target\church-app-backend-0.0.1-SNAPSHOT.jar`

---

## 📤 Step 1: Upload and Deploy via AWS Console

### **1.1 Navigate to Elastic Beanstalk**

1. Go to **AWS Console** → **Elastic Beanstalk**
2. Click on your environment: **`Church-app-backend-prod`**

### **1.2 Upload and Deploy**

1. Click the orange **"Upload and deploy"** button (top right)
2. Click **"Choose file"**
3. Navigate to: `C:\Users\Admin\Church-App\Church-App\backend\target\`
4. Select: `church-app-backend-0.0.1-SNAPSHOT.jar`
5. **Version label:** Enter `v1.0.0` (or any version name you prefer)
6. **Description (optional):** "Initial production deployment"
7. Click **"Deploy"**

### **1.3 Wait for Deployment**

- Deployment takes **5-10 minutes**
- You'll see progress in the **Events** tab
- Status will show "Deploying..." then "Ok" when complete

---

## ✅ Step 2: Verify Deployment

### **2.1 Check Health Status**

1. In Elastic Beanstalk console, check **"Health"** status
2. Should show **"Ok"** (green) after deployment completes

### **2.2 Test Health Endpoint**

Your environment URL:
```
http://Church-app-backend-prod.eba-jmp5ju3e.us-west-2.elasticbeanstalk.com
```

Test health endpoint:
```
http://Church-app-backend-prod.eba-jmp5ju3e.us-west-2.elasticbeanstalk.com/api/actuator/health
```

**Expected response:**
```json
{
  "status": "UP"
}
```

### **2.3 Check Logs**

1. In Elastic Beanstalk → **"Logs"** tab
2. Click **"Request logs"** → **"Last 100 lines"**
3. Check for any errors or startup issues

---

## 🔒 Step 3: Configure Database Security Group

Before your app can connect to the database, you need to allow Elastic Beanstalk to access RDS.

### **3.1 Find Elastic Beanstalk Security Group**

1. Go to **EC2 Console** → **Security Groups**
2. Look for security group with name like:
   - `awseb-e-fdxub8xm5s-stack-AWSEBSecurityGroup-xxxxx`
   - Or search for security groups containing "elasticbeanstalk"

### **3.2 Update RDS Security Group**

1. Go to **RDS Console** → Your database (`church-app-db`)
2. Click on **"VPC security groups"** link
3. Click on the security group (e.g., `sg-xxxxx`)
4. Click **"Edit inbound rules"**
5. **Add rule:**
   - **Type:** PostgreSQL
   - **Port:** 5432
   - **Source:** Select **"Custom"** → Choose the Elastic Beanstalk security group
     - Look for the security group you found in step 3.1
   - **Description:** "Allow Elastic Beanstalk to access database"
6. Click **"Save rules"**

---

## 🧪 Step 4: Test API Endpoints

After security group is configured, test your API:

### **4.1 Health Check**
```
GET http://Church-app-backend-prod.eba-jmp5ju3e.us-west-2.elasticbeanstalk.com/api/actuator/health
```

### **4.2 Test Other Endpoints**

Once health check works, you can test:
- Authentication endpoints
- API endpoints
- Database connectivity

---

## 🐛 Troubleshooting

### **Deployment Fails**
- Check **Logs** tab for errors
- Verify environment variables are correct
- Check JAR file size (should be reasonable, not 0 bytes)

### **Health Check Fails**
- Check application logs
- Verify database security group allows EB access
- Check environment variables (especially database connection)

### **Can't Connect to Database**
- Verify RDS security group allows Elastic Beanstalk security group
- Check database endpoint is correct in environment variables
- Verify database credentials

### **502 Bad Gateway**
- Application might still be starting (wait 2-3 minutes)
- Check health endpoint: `/api/actuator/health`
- Review application logs for errors

---

## 📝 Next Steps After Successful Deployment

1. ✅ **Test all API endpoints**
2. ✅ **Update frontend** with API URL: `http://Church-app-backend-prod.eba-jmp5ju3e.us-west-2.elasticbeanstalk.com/api`
3. ✅ **Request SSL certificate** for `api.thegathrd.com`
4. ✅ **Configure HTTPS** on load balancer
5. ✅ **Set up custom domain** in GoDaddy DNS

---

**Ready to deploy?** Click "Upload and deploy" in Elastic Beanstalk console! 🚀

