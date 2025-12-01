import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext'; // Not currently used

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // const { setUser } = useAuth(); // Not currently used in this component

  useEffect(() => {
    // Debug: Log current URL and all search params
    console.log('🔍 AuthCallback - Current URL:', window.location.href);
    console.log('🔍 AuthCallback - Search params:', Object.fromEntries(searchParams.entries()));
    
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    const role = searchParams.get('role');
    const isNewUser = searchParams.get('isNewUser') === 'true';
    const error = searchParams.get('error');

    // Debug: Log all extracted values
    console.log('🔍 AuthCallback - Extracted values:', {
      token: token ? 'Present' : 'Missing',
      refreshToken: refreshToken ? 'Present' : 'Missing',
      userId: userId || 'Missing',
      email: email || 'Missing',
      name: name || 'Missing',
      role: role || 'Missing',
      isNewUser,
      error: error || 'None'
    });

    if (error) {
      console.error('OAuth2 error:', error);
      navigate('/login', { 
        state: { error: 'Authentication failed. Please try again.' } 
      });
      return;
    }

    if (token && userId && email && name && role) {
      const userData = {
        userId,
        email,
        name,
        role,
        profilePicUrl: searchParams.get('profilePicUrl'),
      };

      // Save to localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('refreshToken', refreshToken || '');
      localStorage.setItem('user', JSON.stringify(userData));

      // Force a page reload to refresh the auth context
      console.log('OAuth2 login successful, redirecting to dashboard');
      setTimeout(() => {
        window.location.href = isNewUser ? '/profile' : '/dashboard';
      }, 1000);
    } else {
      console.error('Missing authentication data');
      navigate('/login', { 
        state: { error: 'Authentication data incomplete. Please try again.' } 
      });
    }
  }, [searchParams, navigate]);

  return (
    <div className="auth-callback-container">
      <div className="auth-callback">
        <div className="loading-spinner">⏳</div>
        <h2>🔐 Completing Authentication...</h2>
        <p>Please wait while we finish setting up your account.</p>
      </div>
    </div>
  );
};

export default AuthCallback;