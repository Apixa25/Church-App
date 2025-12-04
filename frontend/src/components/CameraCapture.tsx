import React, { useRef, useState, useEffect } from 'react';
import { Camera, Video, RefreshCw, X } from 'lucide-react';
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

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // No orientation lock - allow both portrait and landscape

  // Initialize camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode, captureMode]);

  const startCamera = async () => {
    try {
      setError(null);
      setPermissionDenied(false);

      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true // Always request audio so it's ready for video recording
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
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
      const options = { mimeType: 'video/webm;codecs=vp8,opus' };

      // Fallback for browsers that don't support the preferred codec
      const mimeType = MediaRecorder.isTypeSupported(options.mimeType)
        ? options.mimeType
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });
        setCapturedFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
        stopCamera();
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please try again.');
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
                className="camera-video"
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
            <>
              <button className="control-btn secondary" onClick={handleRetake}>
                Retake
              </button>
              <button className="control-btn primary" onClick={handleUseCapture}>
                Use This
              </button>
            </>
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
