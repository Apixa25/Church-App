# Simple script to create church_app database using JDBC
Write-Host ""
Write-Host "Creating church_app database on RDS..." -ForegroundColor Cyan
Write-Host ""

$DB_HOST = "church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com"
$DB_PORT = "5432"
$DB_USER = "church_user"
$NEW_DB_NAME = "church_app"

Write-Host "Enter your database password:" -ForegroundColor Yellow
$securePassword = Read-Host -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$DB_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Connect to postgres database
$POSTGRES_URL = "jdbc:postgresql://${DB_HOST}:${DB_PORT}/postgres"

Write-Host ""
Write-Host "Connecting to: $DB_HOST" -ForegroundColor Cyan
Write-Host "Creating database: $NEW_DB_NAME" -ForegroundColor Cyan
Write-Host ""

# Use Maven to download PostgreSQL driver if needed, then use a simple approach
# We'll use Flyway's ability to execute SQL, but first let's try a direct approach

# Create a temporary migration file that creates the database
$migrationDir = "src\main\resources\db\migration"
$tempMigration = Join-Path $migrationDir "V0__create_church_app_database.sql"

# Check if database already exists by trying to connect
Write-Host "Checking if database exists..." -ForegroundColor Cyan

# Try to connect to church_app - if it fails with "does not exist", we need to create it
$TEST_URL = "jdbc:postgresql://${DB_HOST}:${DB_PORT}/${NEW_DB_NAME}"
$testResult = .\mvnw.cmd flyway:info "-Dflyway.url=$TEST_URL" "-Dflyway.user=$DB_USER" "-Dflyway.password=$DB_PASSWORD" 2>&1 | Out-String

if ($testResult -match "does not exist") {
    Write-Host "Database does not exist. Creating it..." -ForegroundColor Yellow
    
    # Use psql if available, otherwise use a Java approach
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    
    if ($psqlPath) {
        Write-Host "Using psql to create database..." -ForegroundColor Cyan
        $env:PGPASSWORD = $DB_PASSWORD
        psql -h $DB_HOST -U $DB_USER -d postgres -c "CREATE DATABASE $NEW_DB_NAME;"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Database '$NEW_DB_NAME' created successfully!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "Failed to create database using psql." -ForegroundColor Red
            Write-Host "Trying alternative method..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "psql not found. Using Java/JDBC method..." -ForegroundColor Yellow
        
        # Create a simple Java program
        $javaCode = @'
import java.sql.*;
public class CreateDB {
    public static void main(String[] args) {
        String url = "POSTGRES_URL_PLACEHOLDER";
        String user = "DB_USER_PLACEHOLDER";
        String password = "DB_PASSWORD_PLACEHOLDER";
        String dbName = "NEW_DB_NAME_PLACEHOLDER";
        
        try {
            Class.forName("org.postgresql.Driver");
            Connection conn = DriverManager.getConnection(url, user, password);
            Statement stmt = conn.createStatement();
            stmt.executeUpdate("CREATE DATABASE " + dbName);
            System.out.println("Database created successfully!");
            stmt.close();
            conn.close();
        } catch (SQLException e) {
            if (e.getMessage().contains("already exists")) {
                System.out.println("Database already exists.");
            } else {
                System.err.println("Error: " + e.getMessage());
                System.exit(1);
            }
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            System.exit(1);
        }
    }
}
'@
        
        $javaCode = $javaCode -replace "POSTGRES_URL_PLACEHOLDER", $POSTGRES_URL
        $javaCode = $javaCode -replace "DB_USER_PLACEHOLDER", $DB_USER
        $javaCode = $javaCode -replace "DB_PASSWORD_PLACEHOLDER", $DB_PASSWORD
        $javaCode = $javaCode -replace "NEW_DB_NAME_PLACEHOLDER", $NEW_DB_NAME
        
        $javaFile = "$env:TEMP\CreateDB.java"
        $javaCode | Out-File -FilePath $javaFile -Encoding UTF8
        
        # Get PostgreSQL driver
        $postgresJar = (Get-ChildItem -Path "$env:USERPROFILE\.m2\repository\org\postgresql\postgresql\*\postgresql-*.jar" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
        
        if (-not $postgresJar) {
            Write-Host "Downloading PostgreSQL driver..." -ForegroundColor Yellow
            .\mvnw.cmd dependency:copy -Dartifact=org.postgresql:postgresql:42.7.4 -DoutputDirectory=.
            $postgresJar = (Get-ChildItem -Path ".\postgresql-*.jar" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
        }
        
        if ($postgresJar) {
            javac -cp $postgresJar $javaFile
            if ($LASTEXITCODE -eq 0) {
                java -cp "$postgresJar;$env:TEMP" CreateDB
            }
        }
    }
} else {
    Write-Host "Database '$NEW_DB_NAME' may already exist or connection failed." -ForegroundColor Yellow
    Write-Host "Attempting to verify..." -ForegroundColor Cyan
}

# Verify database was created
Write-Host ""
Write-Host "Verifying database creation..." -ForegroundColor Cyan
$verifyResult = .\mvnw.cmd flyway:info "-Dflyway.url=$TEST_URL" "-Dflyway.user=$DB_USER" "-Dflyway.password=$DB_PASSWORD" 2>&1 | Out-String

if ($verifyResult -notmatch "does not exist") {
    Write-Host ""
    Write-Host "SUCCESS! Database '$NEW_DB_NAME' is ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run migrations:" -ForegroundColor Cyan
    Write-Host "  .\run-migrations-simple.ps1" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Database creation may have failed. Please check the errors above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Install PostgreSQL client tools (psql) and run:" -ForegroundColor Yellow
    Write-Host "  psql -h $DB_HOST -U $DB_USER -d postgres -c 'CREATE DATABASE $NEW_DB_NAME;'" -ForegroundColor White
}

# Cleanup
$DB_PASSWORD = $null
$env:PGPASSWORD = $null
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

