import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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

  const handleGoogleSignup = () => {
    window.location.href = 'http://localhost:8080/api/oauth2/authorization/google';
  };

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