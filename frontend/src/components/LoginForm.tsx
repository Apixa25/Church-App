import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/runtimeConfig';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();
  
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  // Check for error from navigation state (e.g., from AuthCallback or AuthError)
  useEffect(() => {
    if (location.state && (location.state as any).error) {
      setError((location.state as any).error);
      // Clear the state to prevent showing the error again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    const apiUrl = getApiUrl();

    if (Capacitor.isNativePlatform()) {
      // On native, use the in-app browser so the OAuth redirect comes back correctly
      const callbackUrl = `${window.location.origin}/auth/callback`;
      document.cookie = `oauth_frontend_url=${encodeURIComponent(callbackUrl)}; path=/; max-age=300; SameSite=Lax`;

      // Listen for the browser to redirect back to our app
      Browser.addListener('browserFinished', () => {
        Browser.removeAllListeners();
      });

      await Browser.open({
        url: `${apiUrl}/oauth2/authorization/google`,
        presentationStyle: 'popover',
      });
    } else {
      document.cookie = `oauth_frontend_url=${encodeURIComponent(window.location.origin)}; path=/; max-age=300; SameSite=Lax`;
      window.location.href = `${apiUrl}/oauth2/authorization/google`;
    }
  };

  const handleAppleLogin = useCallback(async () => {
    try {
      setError(null);
      // @ts-ignore — AppleID JS SDK loaded from CDN
      const appleAuth = (window as any).AppleID;
      if (!appleAuth) {
        setError('Apple Sign-In is not available. Please try another method.');
        return;
      }

      appleAuth.auth.init({
        clientId: 'com.thegathering.app',
        scope: 'name email',
        redirectURI: window.location.origin + '/auth/callback',
        usePopup: true,
      });

      const response = await appleAuth.auth.signIn();
      const { authorization, user: appleUser } = response;

      const apiUrl = getApiUrl();
      const result = await axios.post(`${apiUrl}/auth/apple`, {
        idToken: authorization.id_token,
        userId: authorization.code,
        email: appleUser?.email || null,
        name: appleUser?.name
          ? `${appleUser.name.firstName || ''} ${appleUser.name.lastName || ''}`.trim()
          : null,
      });

      const authData = result.data;
      const userData = {
        userId: authData.userId,
        email: authData.email,
        name: authData.name,
        role: authData.role,
        profilePicUrl: authData.profilePicUrl || undefined,
      };

      localStorage.setItem('authToken', authData.token);
      localStorage.setItem('refreshToken', authData.refreshToken || '');
      localStorage.setItem('user', JSON.stringify(userData));

      window.location.href = authData.newUser ? '/profile' : '/dashboard';
    } catch (err: any) {
      if (err?.error === 'popup_closed_by_user') return;
      console.error('Apple Sign-In error:', err);
      setError('Apple Sign-In failed. Please try again.');
    }
  }, []);

  return (
    <div className="login-form-container">
      <div className="login-form">
        <h2>🌾 Welcome to The Gathering</h2>
        <p>Sign in to connect with your community</p>
        
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: 'Please enter a valid email',
                },
              })}
              disabled={loading}
            />
            {errors.email && <span className="error">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
              disabled={loading}
            />
            {errors.password && <span className="error">{errors.password.message}</span>}
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? '⏳ Signing In...' : '🔑 Sign In'}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button 
          type="button" 
          className="google-button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <img 
            src="https://developers.google.com/identity/images/g-logo.png" 
            alt="Google" 
            className="google-icon"
          />
          Continue with Google
        </button>

        <button
          type="button"
          className="apple-button"
          onClick={handleAppleLogin}
          disabled={loading}
        >
          <svg className="apple-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Continue with Apple
        </button>

        <div className="auth-links">
          <p>
            Don't have an account?{' '}
            <button 
              type="button" 
              className="link-button"
              onClick={() => navigate('/register')}
            >
              Sign up here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;