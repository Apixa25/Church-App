# Church App Backend

## 🚀 Getting Started

### Prerequisites
- Java 17+
- Maven 3.6+
- PostgreSQL 12+
- Docker (recommended)

### Database Setup

1. **Using Docker (Recommended)**:
   ```bash
   cd backend
   docker-compose up -d
   ```

2. **Manual PostgreSQL Setup**:
   - Install PostgreSQL
   - Create database: `church_app`
   - Create user: `church_user` with password: `church_password`
   - Grant privileges to user

### Configuration

1. **Google OAuth Setup**:
   - Go to [Google Console](https://console.developers.google.com/)
   - Create OAuth 2.0 credentials
   - Update `application.properties`:
     ```properties
     spring.security.oauth2.client.registration.google.client-id=your-client-id
     spring.security.oauth2.client.registration.google.client-secret=your-client-secret
     ```

2. **JWT Secret**:
   - Update the JWT secret in `application.properties` for production:
     ```properties
     jwt.secret=your-super-secure-256-bit-secret-key
     ```

### Running the Application

```bash
cd backend
mvn spring-boot:run
```

The application will start on `http://localhost:8080`

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/validate` - Validate JWT token
- `POST /api/auth/logout` - Logout user

#### Health Check
- `GET /actuator/health` - Application health status

### Testing the API

**Register a new user**:
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Login**:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

## 🏗️ Architecture

### Database Schema
- **users**: User profiles and authentication
- UUID primary keys for all entities
- Proper indexing on frequently queried fields
- Soft deletes where appropriate

### Security Features
- JWT token-based authentication
- Google OAuth 2.0 integration
- CORS configuration for frontend
- Role-based access control (MEMBER, MODERATOR, ADMIN)
- Password encryption using BCrypt

### Error Handling
- Global exception handling
- Proper HTTP status codes
- Detailed error messages in development
- Sanitized error messages in production