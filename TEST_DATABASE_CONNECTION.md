# 🧪 Test Database Connection & Run Migrations

This guide will help you test your RDS database connection and run Flyway migrations.

---

## ✅ Prerequisites

- [x] Database created and available
- [x] Security group configured
- [x] Database endpoint saved
- [x] Database password saved securely

---

## 🧪 Step 1: Test Database Connection

### **Option A: Using PowerShell (if you have psql installed)**

```powershell
# Test connection
psql -h church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com -U church_user -d church_app
```

**If you don't have psql installed**, skip to Option B.

### **Option B: Test via Backend Application**

We'll test the connection by running the backend with the database configuration.

---

## 🔧 Step 2: Set Up Environment Variables

Create a temporary `.env` file in the `backend` directory (don't commit this):

```bash
# Database Configuration
DB_HOST=church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com
DB_PORT=5432
DB_NAME=church_app
DB_USER=church_user
DB_PASSWORD=[YOUR_DATABASE_PASSWORD]
DB_URL=jdbc:postgresql://church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com:5432/church_app
```

**Or set them in PowerShell:**

```powershell
$env:DB_HOST="church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com"
$env:DB_PORT="5432"
$env:DB_NAME="church_app"
$env:DB_USER="church_user"
$env:DB_PASSWORD="[YOUR_PASSWORD]"
$env:DB_URL="jdbc:postgresql://church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com:5432/church_app"
```

---

## 🗄️ Step 3: Run Flyway Migrations

Flyway will create all the database tables and schema automatically.

### **3.1 Navigate to Backend Directory**

```powershell
cd backend
```

### **3.2 Run Migrations**

```powershell
# Set environment variables first (if not already set)
$env:DB_URL="jdbc:postgresql://church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com:5432/church_app"
$env:DB_USER="church_user"
$env:DB_PASSWORD="[YOUR_PASSWORD]"

# Run migrations
mvn flyway:migrate -Dflyway.url=$env:DB_URL -Dflyway.user=$env:DB_USER -Dflyway.password=$env:DB_PASSWORD
```

### **3.3 Verify Migrations**

```powershell
# Check migration status
mvn flyway:info -Dflyway.url=$env:DB_URL -Dflyway.user=$env:DB_USER -Dflyway.password=$env:DB_PASSWORD
```

**Expected output:** Should show all migrations as "Success" or "Pending"

---

## ✅ Step 4: Verify Database Schema

After migrations complete, verify tables were created:

### **Option A: Using psql (if installed)**

```sql
-- Connect to database
psql -h church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com -U church_user -d church_app

-- List tables
\dt

-- Check flyway schema history
SELECT * FROM flyway_schema_history;

-- Exit
\q
```

### **Option B: Check via Backend**

The backend will automatically verify the schema when it starts.

---

## 🎯 What Migrations Will Create

Flyway will create:
- ✅ All database tables (users, posts, prayers, events, etc.)
- ✅ Indexes for performance
- ✅ Foreign key relationships
- ✅ Initial data (if any migrations include it)
- ✅ Flyway schema history table

---

## 🆘 Troubleshooting

### **"Connection refused" or "Timeout"**
- Check security group allows your IP
- Verify database endpoint is correct
- Check database status is "Available" in RDS console

### **"Authentication failed"**
- Verify username is correct: `church_user`
- Check password is correct
- Make sure no extra spaces in password

### **"Database does not exist"**
- Database name should be: `church_app`
- Verify database was created successfully

### **"Migration failed"**
- Check database logs in RDS console
- Verify all previous migrations completed
- Check for any SQL syntax errors

---

## 📝 Next Steps After Migrations

Once migrations are complete:
1. ✅ Database schema ready
2. ⏭️ Set up S3 bucket
3. ⏭️ Set up Elastic Beanstalk
4. ⏭️ Deploy backend
5. ⏭️ Deploy frontend

---

**Ready to run migrations!** 🚀

