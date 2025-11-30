# 🚀 Elastic Beanstalk Quick Start - Console Setup

Follow these steps in order. I'll guide you through each one!

---

## 📋 Step-by-Step Checklist

### **Step 1: Navigate to Elastic Beanstalk**
- [ ] Open AWS Console
- [ ] Search for "Elastic Beanstalk"
- [ ] Click on Elastic Beanstalk service

### **Step 2: Create Application**
- [ ] Click "Create application"
- [ ] Application name: `church-app-backend`
- [ ] Click "Next"

### **Step 3: Create Environment**
- [ ] Environment name: `church-app-api-prod`
- [ ] Platform: Java
- [ ] Platform version: Java 17 running on 64bit Amazon Linux 2023
- [ ] Application code: "Upload your code" → "Local file" (we'll upload JAR later)

### **Step 4: Configure Service Access**
- [ ] Service role: "Create and use new service role"
- [ ] EC2 key pair: "Create new key pair" or skip
- [ ] EC2 instance profile: "Create and use new instance profile"

### **Step 5: Configure Capacity**
- [ ] Environment type: "Load balanced"
- [ ] Instance type: t3.small
- [ ] Min instances: 1
- [ ] Max instances: 4

### **Step 6: Configure Load Balancer**
- [ ] Load balancer type: Application Load Balancer
- [ ] Listener: Port 80 (HTTP) - already enabled

### **Step 7: Configure Health Check**
- [ ] Health check URL: `/api/actuator/health`
- [ ] Health check grace period: 300 seconds

### **Step 8: Review and Create**
- [ ] Review all settings
- [ ] Click "Create environment"

### **Step 9: Wait for Creation**
- [ ] Wait 5-10 minutes for environment to be created
- [ ] Status will change to "Ok" when ready

---

## ⚙️ After Creation: Configure Environment Variables

### **Step 10: Add Environment Variables**
1. Click "Configuration" tab
2. Scroll to "Software" section
3. Click "Edit"
4. Add all environment variables (see SETUP_ELASTIC_BEANSTALK.md)
5. Click "Apply"

---

## 📦 After Configuration: Deploy Application

### **Step 11: Build JAR File**
```powershell
cd backend
.\mvnw.cmd clean package -DskipTests
```

### **Step 12: Upload and Deploy**
1. In Elastic Beanstalk console
2. Click "Upload and deploy"
3. Select JAR file: `backend\target\church-app-0.0.1-SNAPSHOT.jar`
4. Version label: `v1.0.0`
5. Click "Deploy"

---

**Let's start!** 🚀

