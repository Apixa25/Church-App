import React, { useState } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import './WebSocketStatusIndicator.css';

const WebSocketStatusIndicator: React.FC = () => {
  const { isConnected, connectionStatus } = useWebSocket();
  const [showDetails, setShowDetails] = useState(false);

  if (!isConnected && connectionStatus.reconnectAttempts === 0) {
    // Don't show indicator if never attempted connection
    return null;
  }

  return (
    <div 
      className={`websocket-status-indicator ${isConnected ? 'connected' : 'disconnected'}`}
      onClick={() => setShowDetails(!showDetails)}
      title={isConnected ? 'WebSocket Connected' : 'WebSocket Disconnected - Click for details'}
    >
      <div className="status-icon">
        {isConnected ? '🟢' : '🔴'}
      </div>
      <span className="status-text">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
      
      {showDetails && (
        <div className="status-details">
          <div className="detail-item">
            <strong>Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <div className="detail-item">
            <strong>URL:</strong> {connectionStatus.url}
          </div>
          {connectionStatus.reconnectAttempts > 0 && (
            <div className="detail-item">
              <strong>Reconnect Attempts:</strong> {connectionStatus.reconnectAttempts}
            </div>
          )}
          {!isConnected && (
            <div className="detail-item warning">
              ⚠️ Real-time features may not work. The connection will retry automatically.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebSocketStatusIndicator;

