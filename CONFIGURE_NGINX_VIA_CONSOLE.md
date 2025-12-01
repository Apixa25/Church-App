# 🎯 Configure Nginx Upload Size Limit via AWS Console

## ✅ Why This Method is Better

- ✅ **No code changes needed** - Configure directly in AWS
- ✅ **No deployment issues** - Won't hang or break deployments
- ✅ **Easy to update** - Change anytime without redeploying
- ✅ **Immediate effect** - Changes apply right away
- ✅ **Reversible** - Easy to undo if needed

---

## 🚀 Step-by-Step Instructions

### Step 1: Go to Elastic Beanstalk Console

1. Open **AWS Console**
2. Go to **Elastic Beanstalk** service
3. Region: **us-west-2** (or your region)
4. Click on your environment (e.g., `church-app-backend-prod`)

### Step 2: Navigate to Configuration

1. In the left sidebar, click **"Configuration"**
2. Scroll down to find **"Load balancer"** section
3. Click **"Edit"** button (top right of the Load balancer section)

### Step 3: Add Nginx Configuration

1. Scroll down to find **"Processes"** or **"Listener rules"** section
2. Look for **"Additional configuration"** or **"Nginx configuration"** section
3. If you see a text area for nginx config, add this:

```nginx
client_max_body_size 100M;
client_body_buffer_size 128k;
client_body_timeout 300s;
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
```

**OR** if there's a section for **"Environment properties"** or **"Additional settings"**, you might need to use a different approach (see Step 4).

### Step 4: Alternative - Use Configuration Files Section

If you don't see nginx config options in Load balancer:

1. In **Configuration** page, look for **"Software"** section
2. Click **"Edit"** on Software section
3. Scroll to **"Environment properties"**
4. Look for any nginx-related settings

**OR** try this approach:

1. Go to **Configuration** → **Software** → **Edit**
2. Look for **"Proxy server"** or **"Reverse proxy"** settings
3. There might be an option to add custom nginx configuration

---

## 🔍 If You Can't Find Nginx Config in Console

Some Elastic Beanstalk environments don't expose nginx config directly in the console. In that case, we have two options:

### Option A: Use EB Extensions (Simplified Version)

I'll create a much simpler `.ebextensions` file that just creates a config file without any complex commands.

### Option B: Use Platform Hooks

Create a `.platform` hook that's more reliable than `.ebextensions`.

---

## 📋 What to Look For

When you're in the Configuration page, look for these sections:

- ✅ **Load balancer** → **Edit** → Look for nginx/proxy settings
- ✅ **Software** → **Edit** → Look for proxy/nginx configuration
- ✅ **Processes** → **Edit** → Look for additional settings
- ✅ **Environment properties** → Look for nginx-related variables

---

## 🎯 What We're Trying to Set

The key setting we need is:
```
client_max_body_size 100M;
```

This tells nginx to accept uploads up to 100MB.

---

## ✅ After Configuration

1. Click **"Apply"** at the bottom
2. Wait 2-5 minutes for the configuration to update
3. Your environment will restart automatically
4. Test by uploading a file larger than 1MB

---

## 🆘 If You Can't Find the Option

**Let me know what sections you see** in the Configuration page, and I'll guide you to the right place! 

Or we can use the simplified `.ebextensions` approach that won't cause deployment issues.

---

**This is much easier than the deployment approach!** 🎉

