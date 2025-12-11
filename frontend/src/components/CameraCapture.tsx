import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Camera, Video, RefreshCw, X, Check, RotateCcw } from 'lucide-react';
import './CameraCapture.css';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

type CaptureMode = 'photo' | 'video';
type FacingMode = 'user' | 'environment';

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('photo');
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  // Recording timer - optimized to prevent unnecessary re-renders
  // Use ref to track time without causing re-renders of video element
  const recordingTimeRef = useRef(0);
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        recordingTimeRef.current += 1;
        // Only update state for UI display, but minimize re-renders
        setRecordingTime(recordingTimeRef.current);
      }, 1000);
    } else {
      recordingTimeRef.current = 0;
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // No orientation lock - allow both portrait and landscape

  // Initialize camera - only restart when facingMode changes
  // No need to restart when switching photo/video since audio is always requested
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]); // Removed captureMode - no need to restart camera

  const startCamera = async () => {
    try {
      setError(null);
      setPermissionDenied(false);

      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Optimized video constraints for smooth preview and recording
      // 720p provides smooth real-time rendering while maintaining good quality
      // Higher resolutions cause jittery preview due to browser rendering limitations
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          // 720p max for smooth preview - higher resolutions cause jitter
          width: { ideal: 1280, min: 640, max: 1280 },
          height: { ideal: 720, min: 480, max: 720 },
          // Cap at 30fps for smooth performance (60fps causes jitter on many devices)
          frameRate: { ideal: 30, min: 24, max: 30 }
        },
        audio: true // Always request audio so switching to video mode doesn't restart camera
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        // CRITICAL: Set srcObject directly without causing re-render
        // Don't recreate the video element - just update the stream
        videoRef.current.srcObject = mediaStream;
        
        // Ensure video element is ready and optimize for smooth playback
        videoRef.current.onloadedmetadata = () => {
          const videoTrack = mediaStream.getVideoTracks()[0];
          const settings = videoTrack.getSettings();
          console.log('📹 Camera ready:', {
            width: videoRef.current?.videoWidth || settings.width,
            height: videoRef.current?.videoHeight || settings.height,
            frameRate: settings.frameRate
          });
          
          // Force video to play smoothly (prevent browser optimizations that cause jitter)
          if (videoRef.current) {
            videoRef.current.play().catch(err => {
              console.warn('Video autoplay prevented:', err);
            });
          }
        };
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Failed to access camera. Please try again.');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleFlipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleCaptureModeToggle = () => {
    setCaptureMode(prev => prev === 'photo' ? 'video' : 'photo');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setCapturedFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
        stopCamera();
      }
    }, 'image/jpeg', 0.95);
  };

  const startRecording = () => {
    if (!stream) return;

    try {
      recordedChunksRef.current = [];
      
      // iOS Safari only supports MP4/H.264 - detect iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      let mimeType: string;
      let fileExtension: string;
      let blobType: string;
      
      if (isIOS) {
        // iOS Safari only supports MP4/H.264
        // Try different MP4 codec options in order of preference
        const mp4Options = [
          'video/mp4;codecs=h264',
          'video/mp4;codecs=avc1.42E01E',
          'video/mp4'
        ];
        
        mimeType = mp4Options.find(option => MediaRecorder.isTypeSupported(option)) || 'video/mp4';
        fileExtension = '.mp4';
        blobType = 'video/mp4';
        
        console.log('iOS detected - using MP4 format:', mimeType);
      } else {
        // Android and desktop browsers - prefer WebM
        const webmOptions = [
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=vp9,opus',
          'video/webm'
        ];
        
        mimeType = webmOptions.find(option => MediaRecorder.isTypeSupported(option)) || 'video/webm';
        fileExtension = '.webm';
        blobType = 'video/webm';
      }

      // If no supported format found, show error
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        const errorMsg = `Video recording not supported on this device. Required format: ${mimeType}`;
        console.error('MediaRecorder not supported for:', mimeType);
        setError(errorMsg);
        return;
      }

      // Calculate bitrate for 720p recording (optimized for smooth performance)
      // 2 Mbps is optimal for 720p - provides good quality without causing jitter
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      const actualWidth = settings.width || videoRef.current?.videoWidth || 1280;
      const actualHeight = settings.height || videoRef.current?.videoHeight || 720;

      // Use 2 Mbps for 720p - optimal balance of quality and smoothness
      // Higher bitrates can cause encoding lag and jittery recording
      const videoBitrate = 2000000;  // 2 Mbps for 720p (smooth recording)
      const audioBitrate = 128000;    // 128 kbps AAC (industry standard)
      
      console.log('📹 Recording settings:', {
        resolution: `${actualWidth}x${actualHeight}`,
        videoBitrate: `${videoBitrate / 1000000} Mbps`,
        audioBitrate: `${audioBitrate / 1000} kbps`
      });

      // Create MediaRecorder with explicit bitrate (critical for quality)
      // This matches Instagram/X.com approach of setting explicit bitrates
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        videoBitsPerSecond: videoBitrate,  // Explicit bitrate prevents browser defaults
        audioBitsPerSecond: audioBitrate   // 128 kbps AAC
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred. Please try again.');
        setIsRecording(false);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: blobType });
        const file = new File([blob], `video-${Date.now()}${fileExtension}`, { type: blobType });
        setCapturedFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
        stopCamera();
      };

      // Start recording with optimized timeslice
      // Larger timeslice (250ms) reduces overhead and improves performance
      // iOS Safari works fine with larger timeslices too
      mediaRecorder.start(250); // Collect data every 250ms (better performance than 100ms)
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err: any) {
      console.error('Error starting recording:', err);
      let errorMessage = 'Failed to start recording. Please try again.';
      
      // Provide more specific error messages
      if (err.name === 'NotSupportedError') {
        errorMessage = 'Video recording is not supported on this device or browser.';
      } else if (err.name === 'InvalidStateError') {
        errorMessage = 'Camera is not ready. Please wait a moment and try again.';
      } else if (err.message) {
        errorMessage = `Recording error: ${err.message}`;
      }
      
      setError(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleCapture = () => {
    if (captureMode === 'photo') {
      capturePhoto();
    } else {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };

  const handleUseCapture = () => {
    if (capturedFile) {
      console.log('📸 CameraCapture: handleUseCapture called with file:', capturedFile.name, capturedFile.size);
      
      // IMPORTANT: Clone the file data before the component might unmount
      // This ensures the file data is preserved even if React batches updates
      const fileClone = new File([capturedFile], capturedFile.name, { type: capturedFile.type });
      console.log('📸 CameraCapture: Created file clone:', fileClone.name, fileClone.size);
      
      // CRITICAL: Call onCapture FIRST, before any cleanup
      // This ensures the parent receives the file before we do anything else
      try {
        console.log('📸 CameraCapture: Calling onCapture...');
        console.log('📸 CameraCapture: onCapture type:', typeof onCapture);
        console.log('📸 CameraCapture: onCapture:', onCapture?.toString().substring(0, 100));
        
        onCapture(fileClone);
        console.log('📸 CameraCapture: onCapture returned successfully');
        
        // FALLBACK: Also try the global function if onCapture didn't work
        const globalCapture = (window as any).__cameraCaptureCallback;
        if (globalCapture && typeof globalCapture === 'function') {
          console.log('📸 CameraCapture: Also calling global fallback...');
          globalCapture(fileClone);
        }
      } catch (error) {
        console.error('📸 CameraCapture: Error calling onCapture:', error);
        
        // Try global fallback on error
        try {
          const globalCapture = (window as any).__cameraCaptureCallback;
          if (globalCapture && typeof globalCapture === 'function') {
            console.log('📸 CameraCapture: Using global fallback after error...');
            globalCapture(fileClone);
          }
        } catch (fallbackError) {
          console.error('📸 CameraCapture: Global fallback also failed:', fallbackError);
        }
      }
      
      // Now clean up AFTER the parent has the file
      // Use setTimeout to let React process the state update first
      setTimeout(() => {
        console.log('📸 CameraCapture: Starting cleanup...');
        stopCamera();
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        // Call onClose to close the modal from our side as backup
        onClose();
      }, 100);
    }
  };

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCapturedFile(null);
    startCamera();
  };

  const handleClose = () => {
    stopCamera();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="camera-capture-modal">
      <div className="camera-capture-container">
        {/* Header */}
        <div className="camera-header">
          <button className="camera-close-btn" onClick={handleClose}>
            <X size={24} />
          </button>
          <h3 className="camera-title">
            {previewUrl ? 'Preview' : captureMode === 'photo' ? 'Take Photo' : 'Record Video'}
          </h3>
          <div className="camera-header-spacer"></div>
        </div>

        {/* Camera/Preview Area */}
        <div className="camera-viewport">
          {error ? (
            <div className="camera-error">
              <div className="error-icon">📷</div>
              <p>{error}</p>
              {permissionDenied && (
                <button className="retry-btn" onClick={startCamera}>
                  Try Again
                </button>
              )}
            </div>
          ) : previewUrl ? (
            <div className="camera-preview">
              {captureMode === 'photo' ? (
                <img src={previewUrl} alt="Captured" className="preview-image" />
              ) : (
                <video src={previewUrl} controls className="preview-video" />
              )}
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                // CRITICAL: Prevent React from recreating video element on re-renders
                // Use key to stabilize element identity
                key="camera-video-preview"
                className={`camera-video ${facingMode === 'user' ? 'mirrored' : ''}`}
                // Performance optimizations for smooth rendering
                style={{
                  // Force GPU acceleration
                  transform: 'translateZ(0)',
                  willChange: 'transform'
                }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {isRecording && (
                <div className="recording-indicator">
                  <div className="recording-dot"></div>
                  <span className="recording-time">{formatTime(recordingTime)}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        <div className="camera-controls">
          {previewUrl ? (
            <div className="preview-actions">
              <button className="preview-btn retake-btn" onClick={handleRetake}>
                <RotateCcw size={28} strokeWidth={2.5} />
                <span>Retake</span>
              </button>
              <button className="preview-btn use-btn" onClick={handleUseCapture}>
                <Check size={32} strokeWidth={3} />
                <span>Use This</span>
              </button>
            </div>
          ) : (
            <>
              <button
                className="control-btn icon-btn"
                onClick={handleCaptureModeToggle}
                disabled={isRecording}
              >
                {captureMode === 'photo' ? <Video size={32} /> : <Camera size={32} />}
              </button>

              <button
                className={`capture-btn ${isRecording ? 'recording' : ''}`}
                onClick={handleCapture}
              >
                {captureMode === 'photo' ? (
                  <div className="capture-circle"></div>
                ) : isRecording ? (
                  <div className="stop-square"></div>
                ) : (
                  <div className="record-circle"></div>
                )}
              </button>

              <button
                className="control-btn icon-btn"
                onClick={handleFlipCamera}
                disabled={isRecording}
              >
                <RefreshCw size={32} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
