# 🔒 Fix Database Security Group

## Problem
Elastic Beanstalk cannot connect to RDS database - connection timeout.

---

## Solution: Update RDS Security Group

### Step 1: Find Elastic Beanstalk Security Group

1. Go to **EC2 Console** → **Security Groups**
2. Look for security group with name like:
   - `awseb-e-fdxub8xm5s-stack-AWSEBSecurityGroup-xxxxx`
   - Or search for groups containing "elasticbeanstalk"
3. **Note the Security Group ID** (e.g., `sg-xxxxx`)

### Step 2: Update RDS Security Group

1. Go to **RDS Console** → Your database (`church-app-db`)
2. Click on **"VPC security groups"** link (under "Connectivity & security")
3. Click on the security group (e.g., `sg-xxxxx`)
4. Click **"Edit inbound rules"**
5. Click **"Add rule"**
6. Configure:
   - **Type:** PostgreSQL
   - **Port:** 5432
   - **Source:** Select **"Custom"** → Choose the Elastic Beanstalk security group
     - Look for the security group you found in Step 1
   - **Description:** "Allow Elastic Beanstalk to access database"
7. Click **"Save rules"**

---

## Alternative: Allow from Elastic Beanstalk VPC

If you can't find the exact security group, you can allow from the entire VPC:

1. In RDS security group, add rule:
   - **Type:** PostgreSQL
   - **Port:** 5432
   - **Source:** Select **"Custom"** → Enter the VPC CIDR (e.g., `172.31.0.0/16`)
   - **Description:** "Allow from VPC"

**Note:** This is less secure but will work. Better to use the specific security group.

---

## Verify Connection

After updating the security group:
1. Wait 1-2 minutes for changes to propagate
2. Restart the Elastic Beanstalk environment:
   - Actions → Restart app server(s)
3. Check logs again - database connection should work

---

**Next:** Fix port configuration (see FIX_PORT_CONFIGURATION.md)

