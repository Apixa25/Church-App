import React, { useState, useEffect, useRef, ReactNode } from 'react';
import './PullToRefresh.css';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
  threshold?: number; // Distance in pixels to trigger refresh
  pullDownThreshold?: number; // Distance to show pull indicator
  useWindow?: boolean; // Use window scroll instead of container scroll
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
  pullDownThreshold = 60,
  useWindow = false,
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const scrollTopRef = useRef<number>(0);

  useEffect(() => {
    const container = useWindow ? window : containerRef.current;
    if (!container || disabled) return;

    const getScrollTop = () => {
      if (useWindow) {
        return window.pageYOffset || document.documentElement.scrollTop;
      }
      return containerRef.current?.scrollTop || 0;
    };

    const handleTouchStart = (e: TouchEvent) => {
      scrollTopRef.current = getScrollTop();
      if (scrollTopRef.current === 0) {
        startYRef.current = e.touches[0].clientY;
        isDraggingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;

      // Check scroll position again in case it changed
      const currentScrollTop = getScrollTop();
      if (currentScrollTop > 0) {
        isDraggingRef.current = false;
        setPullDistance(0);
        setIsPulling(false);
        return;
      }

      currentYRef.current = e.touches[0].clientY;
      const deltaY = currentYRef.current - startYRef.current;

      if (deltaY > 0 && currentScrollTop === 0) {
        e.preventDefault(); // Prevent default scroll behavior
        const distance = Math.min(deltaY * 0.5, threshold * 2); // Damping effect
        setPullDistance(distance);
        setIsPulling(distance > pullDownThreshold);
      }
    };

    const handleTouchEnd = async () => {
      if (!isDraggingRef.current) return;

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          console.error('Pull to refresh error:', error);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          setIsPulling(false);
        }
      } else {
        // Animate back
        setPullDistance(0);
        setIsPulling(false);
      }

      isDraggingRef.current = false;
      startYRef.current = 0;
      currentYRef.current = 0;
    };

    // Mouse events for desktop (for testing/accessibility)
    const handleMouseDown = (e: MouseEvent) => {
      scrollTopRef.current = getScrollTop();
      if (scrollTopRef.current === 0 && e.button === 0) {
        startYRef.current = e.clientY;
        isDraggingRef.current = true;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      // Check scroll position again in case it changed
      const currentScrollTop = getScrollTop();
      if (currentScrollTop > 0) {
        isDraggingRef.current = false;
        setPullDistance(0);
        setIsPulling(false);
        return;
      }

      currentYRef.current = e.clientY;
      const deltaY = currentYRef.current - startYRef.current;

      if (deltaY > 0 && currentScrollTop === 0) {
        e.preventDefault();
        const distance = Math.min(deltaY * 0.5, threshold * 2);
        setPullDistance(distance);
        setIsPulling(distance > pullDownThreshold);
      }
    };

    const handleMouseUp = async () => {
      if (!isDraggingRef.current) return;

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          console.error('Pull to refresh error:', error);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          setIsPulling(false);
        }
      } else {
        setPullDistance(0);
        setIsPulling(false);
      }

      isDraggingRef.current = false;
      startYRef.current = 0;
      currentYRef.current = 0;
    };

    // Touch events
    if (useWindow) {
      // Window-level events
      document.addEventListener('touchstart', handleTouchStart as EventListener, { passive: false });
      document.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
      document.addEventListener('touchend', handleTouchEnd as EventListener);
      document.addEventListener('mousedown', handleMouseDown as EventListener);
      document.addEventListener('mousemove', handleMouseMove as EventListener);
      document.addEventListener('mouseup', handleMouseUp as EventListener);

      return () => {
        document.removeEventListener('touchstart', handleTouchStart as EventListener);
        document.removeEventListener('touchmove', handleTouchMove as EventListener);
        document.removeEventListener('touchend', handleTouchEnd as EventListener);
        document.removeEventListener('mousedown', handleMouseDown as EventListener);
        document.removeEventListener('mousemove', handleMouseMove as EventListener);
        document.removeEventListener('mouseup', handleMouseUp as EventListener);
      };
    } else {
      // Container-level events
      const containerElement = container as HTMLElement;
      containerElement.addEventListener('touchstart', handleTouchStart as EventListener, { passive: false });
      containerElement.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
      containerElement.addEventListener('touchend', handleTouchEnd as EventListener);
      containerElement.addEventListener('mousedown', handleMouseDown as EventListener);
      containerElement.addEventListener('mousemove', handleMouseMove as EventListener);
      containerElement.addEventListener('mouseup', handleMouseUp as EventListener);
      containerElement.addEventListener('mouseleave', handleMouseUp as EventListener);

      return () => {
        containerElement.removeEventListener('touchstart', handleTouchStart as EventListener);
        containerElement.removeEventListener('touchmove', handleTouchMove as EventListener);
        containerElement.removeEventListener('touchend', handleTouchEnd as EventListener);
        containerElement.removeEventListener('mousedown', handleMouseDown as EventListener);
        containerElement.removeEventListener('mousemove', handleMouseMove as EventListener);
        containerElement.removeEventListener('mouseup', handleMouseUp as EventListener);
        containerElement.removeEventListener('mouseleave', handleMouseUp as EventListener);
      };
    }
  }, [disabled, threshold, pullDownThreshold, pullDistance, isRefreshing, onRefresh, useWindow]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const rotation = pullProgress * 180;

  const content = (
    <>
      {(isPulling || isRefreshing) && (
        <div
          className="pull-to-refresh-indicator"
          style={{
            position: useWindow ? 'fixed' : 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
            opacity: Math.min(pullProgress * 2, 1),
            zIndex: 1000,
          }}
        >
          <div
            className={`pull-to-refresh-spinner ${isRefreshing ? 'spinning' : ''}`}
            style={{ transform: `rotate(${isRefreshing ? rotation : 0}deg)` }}
          >
            {isRefreshing ? '🔄' : '↓'}
          </div>
          <span className="pull-to-refresh-text">
            {isRefreshing ? 'Refreshing...' : pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      )}
      {children}
    </>
  );

  if (useWindow) {
    return <>{content}</>;
  }

  return (
    <div ref={containerRef} className="pull-to-refresh-container">
      <div className="pull-to-refresh-content">{content}</div>
    </div>
  );
};

export default PullToRefresh;

