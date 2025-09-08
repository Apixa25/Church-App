# Church App Frontend

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Running the Application

```bash
npm start
```

The application will start on `http://localhost:3000`

### Building for Production

```bash
npm run build
```

### Mobile Development with Capacitor

1. **Add platforms**:
   ```bash
   npx cap add ios
   npx cap add android
   ```

2. **Build and sync**:
   ```bash
   npm run build
   npx cap copy
   npx cap sync
   ```

3. **Open in native IDE**:
   ```bash
   npx cap open ios
   npx cap open android
   ```

## 🏗️ Architecture

### Key Components

- **AuthProvider**: Global authentication state management
- **LoginForm**: User authentication form with email/password and Google OAuth
- **RegisterForm**: User registration with validation
- **Dashboard**: Main application dashboard
- **ProtectedRoute**: Route protection based on authentication status
- **AuthCallback**: Handles OAuth redirect and token processing

### Authentication Flow

1. **Email/Password Authentication**:
   - User submits credentials
   - Frontend sends request to `/api/auth/login`
   - Backend validates and returns JWT token
   - Token stored in localStorage
   - User redirected to dashboard

2. **Google OAuth Authentication**:
   - User clicks "Continue with Google"
   - Redirected to Google OAuth
   - Google redirects to backend callback
   - Backend processes OAuth and redirects to frontend
   - Frontend extracts token from URL params
   - Token stored and user redirected to dashboard

### State Management

- **AuthContext**: Manages user authentication state
- **localStorage**: Persists authentication tokens
- **React Query**: Will be used for data fetching (future sections)

### API Integration

- **axios**: HTTP client with request/response interceptors
- **Automatic token injection**: All authenticated requests include JWT
- **401 handling**: Automatic logout on authentication errors

## 🎨 Features

### Current Features (Section 1: Authentication)
- ✅ User registration with validation
- ✅ Email/password login
- ✅ Google OAuth 2.0 integration
- ✅ JWT token management
- ✅ Protected routes
- ✅ Responsive design
- ✅ Loading states
- ✅ Error handling
- ✅ Professional UI with gradients and animations

### Coming Next (Section 2: User Profiles)
- 🔄 Profile editing
- 🔄 Photo upload
- 🔄 Bio management
- 🔄 Role display

## 📱 Mobile Compatibility

The app is built with Capacitor for cross-platform mobile deployment:

- **iOS**: Native iOS app capabilities
- **Android**: Native Android app capabilities
- **Responsive Design**: Works on all screen sizes
- **Native Features**: Camera, push notifications, etc.

## 🔧 Development Tips

### Environment Variables

Create `.env` file in frontend directory:
```env
REACT_APP_API_URL=http://localhost:8080/api
```

### Testing Authentication

1. Start backend server (`mvn spring-boot:run` in backend directory)
2. Start frontend server (`npm start` in frontend directory)
3. Navigate to `http://localhost:3000`
4. Register a new account or login with existing credentials
5. Try Google OAuth (requires Google OAuth setup)

### Troubleshooting

- **CORS errors**: Ensure backend CORS is configured for `http://localhost:3000`
- **OAuth errors**: Verify Google OAuth client ID and redirect URIs
- **Token issues**: Check JWT secret and expiration settings in backend