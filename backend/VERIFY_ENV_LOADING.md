# ✅ How to Verify Environment Variables are Loading

## 🔍 Quick Test

After running `. .\load-env.ps1`, you can verify the variables were loaded:

### **Method 1: Check a specific variable**

```powershell
# After loading env vars, check Google Client ID
$env:GOOGLE_CLIENT_ID

# Check redirect URI
$env:GOOGLE_REDIRECT_URI

# Check database URL
$env:DB_URL
```

### **Method 2: List all environment variables that start with "GOOGLE"**

```powershell
Get-ChildItem Env: | Where-Object { $_.Name -like "GOOGLE*" }
```

### **Method 3: List all environment variables that start with "DB_"**

```powershell
Get-ChildItem Env: | Where-Object { $_.Name -like "DB_*" }
```

---

## 📋 What You Should See

### **When script runs successfully:**

```
📝 Loading environment variables from .env.local file...

  ✅ GOOGLE_CLIENT_ID
  ✅ GOOGLE_CLIENT_SECRET
  ✅ GOOGLE_REDIRECT_URI
  ✅ FRONTEND_URL
  ✅ DB_HOST
  ✅ DB_PORT
  ✅ DB_NAME
  ✅ DB_USER
  ✅ DB_PASSWORD
  ✅ JWT_SECRET
  ... (more variables)

✅ Environment variables loaded!

🚀 You can now run: .\mvnw.cmd spring-boot:run
```

### **When `.env.local` file is missing:**

```
❌ .env.local file not found at: .\.env.local
📝 Create .env.local file and fill in your values:

   New-Item -Path .env.local -ItemType File
   Then edit .env.local with your actual credentials
```

---

## ⚠️ Important Notes

1. **Environment variables only last for the current PowerShell session**
   - They disappear when you close the terminal
   - You need to run `. .\load-env.ps1` each time you open a new terminal

2. **The dot (`.`) at the beginning is important!**
   - `. .\load-env.ps1` runs the script in the current session (so variables stay)
   - `.\load-env.ps1` runs it in a new session (variables disappear)

3. **Variables are loaded into the current PowerShell process**
   - Your Spring Boot app will read these when you run `.\mvnw.cmd spring-boot:run`
   - After loading env vars, you can start the backend in the same terminal

---

## 🧪 Complete Test Sequence

```powershell
# 1. Navigate to backend folder
cd backend

# 2. Check if .env.local exists
Test-Path .env.local
# Should return: True

# 3. Load environment variables
. .\load-env.ps1

# 4. Verify variables are loaded
$env:GOOGLE_CLIENT_ID
$env:GOOGLE_REDIRECT_URI

# 5. Start the backend (variables will be used)
.\mvnw.cmd spring-boot:run
```

---

## 🐛 Troubleshooting

### **Problem: Variables show as empty after loading**

**Solution:**
- Check that `.env.local` file exists in `backend/` folder
- Verify the file format (one variable per line: `KEY=value`)
- Make sure there are no extra spaces around the `=` sign

### **Problem: Script says file not found**

**Solution:**
```powershell
# Check current directory
pwd
# Should show: C:\Users\Admin\Church-App\Church-App\backend

# Check if file exists
Test-Path .env.local

# If False, create it or navigate to correct location
```

### **Problem: Variables loaded but Spring Boot doesn't see them**

**Solution:**
- Make sure you run `.\mvnw.cmd spring-boot:run` in the **same terminal** where you loaded env vars
- Don't close the terminal after loading - keep it open
- Restart the backend after loading env vars if it was already running

---

**The script is working correctly!** It reads from `backend/.env.local` and sets environment variables in your PowerShell session. 🎉

