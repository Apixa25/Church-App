import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthError: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const errorMessage = searchParams.get('message') || searchParams.get('error') || 'Authentication failed. Please try again.';

  useEffect(() => {
    // Decode the error message if it's URL encoded
    try {
      const decodedMessage = decodeURIComponent(errorMessage);
      console.error('🔴 OAuth Authentication Error:', decodedMessage);
    } catch (e) {
      console.error('🔴 OAuth Authentication Error:', errorMessage);
    }
  }, [errorMessage]);

  return (
    <div className="login-form-container">
      <div className="login-form">
        <h2>⚠️ Authentication Error</h2>
        <div className="error-message" style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(255, 0, 0, 0.1)', borderRadius: '8px' }}>
          {decodeURIComponent(errorMessage)}
        </div>
        <p style={{ marginBottom: '20px', color: '#999' }}>
          We couldn't complete your sign-in with Google. This could be due to:
        </p>
        <ul style={{ textAlign: 'left', marginBottom: '20px', color: '#999' }}>
          <li>Google authentication service temporarily unavailable</li>
          <li>Account access was denied</li>
          <li>Configuration issue with Google OAuth</li>
        </ul>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => navigate('/login')}
            className="login-button"
            style={{ width: '100%' }}
          >
            ← Back to Login
          </button>
          <button
            onClick={() => {
              // Try Google login again
              const { getApiUrl } = require('../config/runtimeConfig');
              const apiUrl = getApiUrl();
              window.location.href = `${apiUrl}/oauth2/authorization/google`;
            }}
            className="google-button"
            style={{ width: '100%' }}
          >
            🔄 Try Again with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthError;

