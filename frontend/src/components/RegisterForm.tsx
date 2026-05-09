import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/runtimeConfig';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const RegisterForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();
  
  const { register: registerUser, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null);
      await registerUser(data.name, data.email, data.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleSignup = async () => {
    const apiUrl = getApiUrl();

    if (Capacitor.isNativePlatform()) {
      const callbackUrl = `${window.location.origin}/auth/callback`;
      document.cookie = `oauth_frontend_url=${encodeURIComponent(callbackUrl)}; path=/; max-age=300; SameSite=Lax`;

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

  const handleAppleSignup = useCallback(async () => {
    try {
      setError(null);
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
    <div className="register-form-container">
      <div className="register-form">
        <h2>🙏 Join Our Church Community</h2>
        <p>Create your account to connect with fellow members</p>
        
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              {...register('name', {
                required: 'Name is required',
                minLength: {
                  value: 2,
                  message: 'Name must be at least 2 characters',
                },
                maxLength: {
                  value: 100,
                  message: 'Name must be less than 100 characters',
                },
              })}
              disabled={loading}
            />
            {errors.name && <span className="error">{errors.name.message}</span>}
          </div>

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

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) =>
                  value === password || 'Passwords do not match',
              })}
              disabled={loading}
            />
            {errors.confirmPassword && (
              <span className="error">{errors.confirmPassword.message}</span>
            )}
          </div>

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? '⏳ Creating Account...' : '✨ Create Account'}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button 
          type="button" 
          className="google-button"
          onClick={handleGoogleSignup}
          disabled={loading}
        >
          <img 
            src="https://developers.google.com/identity/images/g-logo.png" 
            alt="Google" 
            className="google-icon"
          />
          Sign up with Google
        </button>

        <button
          type="button"
          className="apple-button"
          onClick={handleAppleSignup}
          disabled={loading}
        >
          <svg className="apple-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Sign up with Apple
        </button>

        <div className="auth-links">
          <p>
            Already have an account?{' '}
            <button 
              type="button" 
              className="link-button"
              onClick={() => navigate('/login')}
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;