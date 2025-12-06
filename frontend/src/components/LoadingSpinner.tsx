import React from 'react';
import '../styles/theme.css';

export type SpinnerType = 'classic' | 'multi-ring';
export type SpinnerSize = 'inline' | 'small' | 'medium' | 'large' | 'fullscreen';

interface LoadingSpinnerProps {
  /** Type of spinner to display */
  type?: SpinnerType;
  /** Size variant of the spinner */
  size?: SpinnerSize;
  /** Optional text to display below the spinner */
  text?: string;
  /** Additional CSS classes */
  className?: string;
  /** Center the spinner in its container */
  centered?: boolean;
}

/**
 * 🎨 LoadingSpinner Component
 * 
 * A flexible loading indicator component that supports both classic single-ring
 * and vibrant multi-ring spinner styles.
 * 
 * @example
 * // Classic spinner (default)
 * <LoadingSpinner />
 * 
 * @example
 * // Multi-ring spinner, medium size
 * <LoadingSpinner type="multi-ring" size="medium" text="Loading..." />
 * 
 * @example
 * // Fullscreen multi-ring loader
 * <LoadingSpinner type="multi-ring" size="fullscreen" />
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  type = 'classic',
  size = 'medium',
  text,
  className = '',
  centered = true
}) => {
  if (type === 'multi-ring') {
    const containerClasses = [
      'mainLoaderContainer',
      `loader-${size}`,
      centered && size !== 'fullscreen' ? 'spinner-centered' : '',
      className
    ].filter(Boolean).join(' ');

    return (
      <div className={containerClasses}>
        <span className="loaderSpan span1"></span>
        <span className="loaderSpan span2"></span>
        <span className="loaderSpan span3"></span>
        <span className="loaderSpan span4"></span>
        <span className="loaderSpan span5"></span>
        <span className="loaderSpan span6"></span>
        <span className="loaderSpan span7"></span>
        <span className="loaderSpan span8"></span>
        <span className="loaderSpan span9"></span>
        {text && <div style={{ 
          position: 'absolute', 
          bottom: size === 'fullscreen' ? '40%' : '-30px',
          color: 'var(--text-secondary)',
          fontSize: size === 'fullscreen' ? '1.25rem' : '0.875rem',
          marginTop: '20px'
        }}>{text}</div>}
      </div>
    );
  }

  // Classic spinner
  const containerClasses = [
    'spinner-container',
    centered ? 'spinner-centered' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div className="loading-spinner"></div>
      {text && <div style={{ 
        marginTop: '12px',
        color: 'var(--text-secondary)',
        fontSize: '0.875rem'
      }}>{text}</div>}
    </div>
  );
};

export default LoadingSpinner;

