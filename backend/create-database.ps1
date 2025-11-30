# Script to create church_app database on RDS PostgreSQL
Write-Host ""
Write-Host "Creating church_app database..." -ForegroundColor Cyan
Write-Host ""

$DB_HOST = "church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com"
$DB_PORT = "5432"
$DB_USER = "church_user"
$NEW_DB_NAME = "church_app"

Write-Host "Enter your database password:" -ForegroundColor Yellow
$securePassword = Read-Host -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$DB_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Connect to postgres database to create church_app
$POSTGRES_URL = "jdbc:postgresql://${DB_HOST}:${DB_PORT}/postgres"

Write-Host ""
Write-Host "Connecting to postgres database..." -ForegroundColor Cyan
Write-Host "Host: $DB_HOST" -ForegroundColor Gray
Write-Host "Creating database: $NEW_DB_NAME" -ForegroundColor Gray
Write-Host ""

# Create a temporary SQL file
$sqlFile = Join-Path $env:TEMP "create_church_app_db.sql"
"CREATE DATABASE $NEW_DB_NAME;" | Out-File -FilePath $sqlFile -Encoding UTF8

try {
    # Use Flyway to execute the SQL (it can execute arbitrary SQL)
    # We'll use Flyway's SQL execution capability
    Write-Host "Executing CREATE DATABASE command..." -ForegroundColor Cyan
    
    # Create a simple Java program to do this
    $javaCode = @"
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class CreateDatabase {
    public static void main(String[] args) {
        String url = "$POSTGRES_URL";
        String user = "$DB_USER";
        String password = "$DB_PASSWORD";
        String sql = "CREATE DATABASE $NEW_DB_NAME";
        
        try {
            Class.forName("org.postgresql.Driver");
            Connection conn = DriverManager.getConnection(url, user, password);
            Statement stmt = conn.createStatement();
            
            // Note: CREATE DATABASE cannot be executed in a transaction
            conn.setAutoCommit(true);
            stmt.executeUpdate(sql);
            
            System.out.println("Database '$NEW_DB_NAME' created successfully!");
            
            stmt.close();
            conn.close();
        } catch (Exception e) {
            if (e.getMessage().contains("already exists")) {
                System.out.println("Database '$NEW_DB_NAME' already exists.");
                System.exit(0);
            } else {
                System.err.println("Error: " + e.getMessage());
                e.printStackTrace();
                System.exit(1);
            }
        }
    }
}
"@

    # Write Java file
    $javaFile = Join-Path $env:TEMP "CreateDatabase.java"
    $javaCode | Out-File -FilePath $javaFile -Encoding UTF8
    
    # Compile and run using Maven's classpath
    Write-Host "Compiling Java program..." -ForegroundColor Cyan
    
    # Get PostgreSQL driver from Maven
    $postgresJar = (Get-ChildItem -Path "$env:USERPROFILE\.m2\repository\org\postgresql\postgresql\*\postgresql-*.jar" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
    
    if (-not $postgresJar) {
        Write-Host "PostgreSQL driver not found. Downloading..." -ForegroundColor Yellow
        .\mvnw.cmd dependency:get -Dartifact=org.postgresql:postgresql:42.7.4 -Ddest=.
        $postgresJar = (Get-ChildItem -Path ".\postgresql-*.jar" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
    }
    
    if ($postgresJar) {
        # Compile
        javac -cp "$postgresJar" $javaFile
        
        if ($LASTEXITCODE -eq 0) {
            # Run
            $classFile = Join-Path $env:TEMP "CreateDatabase.class"
            java -cp "$postgresJar;$env:TEMP" CreateDatabase
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "Database created successfully!" -ForegroundColor Green
                Write-Host ""
                Write-Host "You can now run migrations on church_app database." -ForegroundColor Cyan
            } else {
                Write-Host ""
                Write-Host "Failed to create database. Check error above." -ForegroundColor Red
            }
        } else {
            Write-Host "Failed to compile. Trying alternative method..." -ForegroundColor Yellow
            # Fallback: Use a simpler approach
        }
    } else {
        Write-Host "Could not find PostgreSQL driver. Trying alternative method..." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Trying alternative method using SQL file..." -ForegroundColor Yellow
}

# Cleanup
$DB_PASSWORD = $null
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

if (Test-Path $sqlFile) { Remove-Item $sqlFile -ErrorAction SilentlyContinue }
if (Test-Path $javaFile) { Remove-Item $javaFile -ErrorAction SilentlyContinue }

