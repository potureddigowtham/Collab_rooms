import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import AdminPanel from './components/AdminPanel';
import RoomPasswordModal from './components/RoomPasswordModal';
import config from './config';
import './Editor.css';

// Simple debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function CodeEditor() {
  const { roomName } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [editorWidth, setEditorWidth] = useState('100%');
  const [language, setLanguage] = useState('plaintext');
  const [timezone, setTimezone] = useState('UTC');
  const [currentTime, setCurrentTime] = useState('');
  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isPasswordValidated, setIsPasswordValidated] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = React.useRef(null);
  const socketRef = React.useRef(null);

  // Check if the room is locked when component mounts
  useEffect(() => {
    const checkRoomLockStatus = async () => {
      try {
        const response = await fetch(`${config.apiUrl}/room/${roomName}/locked`);
        if (!response.ok) {
          console.error('Failed to check room lock status');
          return;
        }
        
        const data = await response.json();
        setIsRoomLocked(data.locked);
        
        // If room is locked and password hasn't been validated yet, show the password modal
        if (data.locked && !isPasswordValidated) {
          setShowPasswordModal(true);
        }
      } catch (error) {
        console.error('Error checking room lock status:', error);
      }
    };
    
    checkRoomLockStatus();
  }, [roomName, isPasswordValidated]);

  // Handle password validation success
  const handlePasswordSuccess = () => {
    setIsPasswordValidated(true);
    setShowPasswordModal(false);
  };

  // Handle password modal cancel (go back to rooms)
  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    navigate('/');
  };
  
  // Update time based on selected timezone
  useEffect(() => {
    const updateTime = () => {
      const options = {
        timeZone: timezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      };
      const time = new Date().toLocaleString('en-US', options);
      setCurrentTime(time);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [timezone]);

  // Timer effect
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerRunning]);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = new WebSocket(`${config.wsUrl}/ws/${roomName}`);
      
      socketRef.current.onopen = () => {
        setIsConnected(true);
        setIsLoading(false);
      };

      socketRef.current.onclose = () => {
        setIsConnected(false);
        setIsLoading(false);
      };

      socketRef.current.onmessage = (event) => {
        setContent(event.data);
      };

      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        setIsLoading(false);
      };
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [roomName]);

  // Debounced function to send the editor content
  const sendContentDebounced = useCallback(
    debounce((valueToSend) => {
      if (socketRef.current && isConnected) {
        console.log('Sending content (debounced)'); // Log when sending
        socketRef.current.send(valueToSend);
      }
    }, 500), // Debounce interval: 500ms
    [isConnected] // Recreate the debounced function if connection status changes
  );

  const handleEditorChange = (value) => {
    setContent(value); // Update local state immediately for responsiveness
    sendContentDebounced(value); // Send the value over WebSocket, but debounced
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const handleTimezoneChange = (e) => {
    setTimezone(e.target.value);
  };

  const toggleMinimap = () => {
    setShowMinimap(!showMinimap);
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleAdminPanelResize = (newAdminPanelWidth) => {
    // Calculate editor width as remaining space
    const totalWidth = window.innerWidth;
    const newEditorWidth = totalWidth - newAdminPanelWidth;
    setEditorWidth(`${newEditorWidth}px`);
  };

  const startTimer = () => {
    setTimerRunning(true);
  };

  const pauseTimer = () => {
    setTimerRunning(false);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimer(0);
  };

  if (isLoading) {
    return (
      <div className="editor-container">
        <div className="editor-loading">Connecting to room...</div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="editor-wrapper" style={{ width: editorWidth }}>
        <div className="editor-header">
          <div className="editor-header-left">
            <button 
              className="notepad-button" 
              onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
              title="Toggle Admin Panel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </button>
            <h1>
              <span className="app-name">Techpath AI Meeting Pad</span>
              {roomName}
            </h1>
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          <button className="toolbar-button" onClick={handleBack}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Rooms
          </button>
        </div>

        <div className="editor-content">
          <div className="editor-toolbar">
            <select
              className="toolbar-button"
              value={language}
              onChange={handleLanguageChange}
              title="Document Type"
            >
              <option value="plaintext">Plain Text</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="csharp">C#</option>
              <option value="php">PHP</option>
              <option value="ruby">Ruby</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="sql">SQL</option>
            </select>

            <select
              className="toolbar-button"
              value={timezone}
              onChange={handleTimezoneChange}
              title="Select Timezone"
            >
              <option value="America/Los_Angeles">PST</option>
              <option value="America/Chicago">CST</option>
              <option value="America/New_York">EST</option>
              <option value="Asia/Kolkata">IST</option>
            </select>

            <div className="toolbar-time" title="Current Time">
              {currentTime}
            </div>

            <button className="toolbar-button" onClick={toggleMinimap} title="Toggle Minimap">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6M14 10l7-7M3 21h6v-6M4 14l7 7"/>
              </svg>
              {showMinimap ? 'Hide Map' : 'Show Map'}
            </button>

            <div className="timer-container" title="Timer" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.2em', fontWeight: 'bold', minWidth: '80px', textAlign: 'center' }}>{Math.floor(timer / 3600).toString().padStart(2, '0')}:
                {Math.floor((timer % 3600) / 60).toString().padStart(2, '0')}:
                {(timer % 60).toString().padStart(2, '0')}
              </span>
              <div className="timer-controls" style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="toolbar-button" 
                  onClick={startTimer} 
                  title="Start Timer" 
                  style={{ 
                    padding: '6px', 
                    width: '32px', 
                    height: '32px', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    borderRadius: '6px',
                    aspectRatio: '1 / 1'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M3 2.5v11l10-5.5-10-5.5z"/>
                  </svg>
                </button>
                <button 
                  className="toolbar-button" 
                  onClick={pauseTimer} 
                  title="Pause Timer" 
                  style={{ 
                    padding: '6px', 
                    width: '32px', 
                    height: '32px', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    borderRadius: '6px',
                    aspectRatio: '1 / 1'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <rect x="3" y="2" width="4" height="12"/>
                    <rect x="9" y="2" width="4" height="12"/>
                  </svg>
                </button>
                <button 
                  className="toolbar-button" 
                  onClick={resetTimer} 
                  title="Reset Timer" 
                  style={{ 
                    padding: '6px', 
                    width: '32px', 
                    height: '32px', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    borderRadius: '6px',
                    aspectRatio: '1 / 1'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                    <path d="M8 1v4l2-2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

            <Editor
              height="100%"
              defaultLanguage="plaintext"
              language={language}
              theme='vs-dark'
              value={content}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: showMinimap },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                renderWhitespace: 'selection',
                padding: { top: 16, bottom: 24 },
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'visible',
                  useShadows: false,
                  verticalScrollbarSize: 14,
                  horizontalScrollbarSize: 14,
                  arrowSize: 30,
                  verticalHasArrows: true,
                  verticalArrowSize: 14,
                },
                overviewRulerLanes: 0,
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
                extraEditorClassName: 'custom-editor',
                fixedOverflowWidgets: true,
                viewInfo: {
                  extraEditorHeight: 60,
                  scrollBeyondLastLine: false
                }
              }}
            />
        </div>
      </div>

      <AdminPanel 
        isOpen={isAdminPanelOpen} 
        onClose={() => setIsAdminPanelOpen(false)}
        onResize={handleAdminPanelResize}
      />

      {showPasswordModal && (
        <RoomPasswordModal
          roomName={roomName}
          onSuccess={handlePasswordSuccess}
          onCancel={handlePasswordCancel}
        />
      )}
    </div>
  );
}

export default CodeEditor;
