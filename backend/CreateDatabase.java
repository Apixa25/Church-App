import java.sql.*;

public class CreateDatabase {
    public static void main(String[] args) {
        // Database connection details
        String host = "church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com";
        String port = "5432";
        String user = "church_user";
        String password = args.length > 0 ? args[0] : "";
        String newDbName = "church_app";
        
        // Connect to postgres database
        String postgresUrl = "jdbc:postgresql://" + host + ":" + port + "/postgres";
        
        try {
            // Load PostgreSQL driver
            Class.forName("org.postgresql.Driver");
            
            System.out.println("Connecting to postgres database...");
            Connection conn = DriverManager.getConnection(postgresUrl, user, password);
            
            // CREATE DATABASE cannot be run in a transaction
            conn.setAutoCommit(true);
            
            System.out.println("Creating database '" + newDbName + "'...");
            Statement stmt = conn.createStatement();
            stmt.executeUpdate("CREATE DATABASE " + newDbName);
            
            System.out.println("SUCCESS! Database '" + newDbName + "' created successfully!");
            
            stmt.close();
            conn.close();
            
        } catch (SQLException e) {
            if (e.getMessage().contains("already exists")) {
                System.out.println("Database '" + newDbName + "' already exists. That's okay!");
            } else {
                System.err.println("Error creating database: " + e.getMessage());
                System.exit(1);
            }
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}

