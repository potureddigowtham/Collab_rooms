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
  const [activeUsers, setActiveUsers] = useState(1); // Add state for active users
  const timerRef = React.useRef(null);
  const socketRef = React.useRef(null);
  const [wordWrap, setWordWrap] = useState('on');
  const [remoteSelections, setRemoteSelections] = useState({});
  const editorRef = React.useRef(null);
  const monacoRef = React.useRef(null);
  const decorationsRef = React.useRef([]);

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

  // Keep track of decoration IDs
  const decorationIdsRef = React.useRef([]);

  // Effect to update decorations when remote selections change
  // Effect to update decorations when remote selections change
  // Effect to update decorations when selections change
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    try {
      // Create decorations for each remote selection
      const decorations = Object.entries(remoteSelections)
        .filter(([userId]) => userId !== socketRef.current?.clientId) // Only show other users' selections
        .map(([userId, selection]) => {
          try {
            return {
              range: new monaco.Range(
                selection.startLineNumber,
                selection.startColumn,
                selection.endLineNumber,
                selection.endColumn
              ),
              options: {
                className: 'remote-selection',
                inlineClassName: 'remote-selection-inline',
                hoverMessage: { value: `Selection by user ${userId}` },
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                zIndex: 5,
                minimap: {
                  color: 'rgba(250, 166, 26, 0.4)',
                  position: 2
                }
              }
            };
          } catch (error) {
            console.error('Error creating decoration for selection:', selection);
            return null;
          }
        }).filter(Boolean);

      // Update decorations
      if (decorations.length > 0) {
        decorationsRef.current = editor.deltaDecorations(
          decorationsRef.current,
          decorations
        );
      } else {
        // Clear decorations if none exist
        decorationsRef.current = editor.deltaDecorations(
          decorationsRef.current,
          []
        );
      }
    } catch (error) {
      console.error('Error updating decorations:', error);
    }
  }, [remoteSelections]);

  // Cleanup decorations when component unmounts
  useEffect(() => {
    return () => {
      if (editorRef.current && decorationsRef.current.length > 0) {
        editorRef.current.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
    };
  }, []);

  // WebSocket connection effect
  useEffect(() => {
    let reconnectTimer;
    let connectionTimeout;
    let isComponentMounted = true;

    const connectWebSocket = () => {
      if (!isComponentMounted || socketRef.current?.readyState === WebSocket.OPEN) return;

      // Initialize WebSocket connection
      socketRef.current = new WebSocket(`${config.wsUrl}/ws/${roomName}`);
      
      // Set a connection timeout
      connectionTimeout = setTimeout(() => {
        if (!isConnected && socketRef.current && isComponentMounted) {
          console.log('Connection timeout, retrying...');
          socketRef.current.close();
          socketRef.current = null;
          connectWebSocket();
        }
      }, 5000); // Increased timeout to 5 seconds

      // Setup WebSocket event handlers
      socketRef.current.onopen = () => {
        if (!isComponentMounted) return;
        clearTimeout(connectionTimeout);
        
        // Generate and store client ID
        const clientId = `user-${Math.random().toString(36).substr(2, 9)}`;
        socketRef.current.clientId = clientId;
        
        // Update state
        setIsConnected(true);
        setIsLoading(false);
        setRemoteSelections({}); // Clear selections on new connection
      };

      socketRef.current.onclose = () => {
        if (!isComponentMounted) return;
        setIsConnected(false);
        setIsLoading(false);
        setRemoteSelections({}); // Clear selections on disconnect
        socketRef.current = null;
        
        // Attempt to reconnect after 2 seconds
        reconnectTimer = setTimeout(connectWebSocket, 2000);
      };

      socketRef.current.onmessage = (event) => {
        if (!isComponentMounted) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'content') {
            setContent(data.content);
          } else if (data.type === 'users') {
            setActiveUsers(data.count);
          } else if (data.type === 'selection' && data.userId !== socketRef.current?.clientId) {
            setRemoteSelections(prev => ({
              ...prev,
              [data.userId]: {
                startLineNumber: data.selection.startLineNumber,
                startColumn: data.selection.startColumn,
                endLineNumber: data.selection.endLineNumber,
                endColumn: data.selection.endColumn,
                userId: data.userId
              }
            }));
          } else if (data.type === 'selection_clear') {
            setRemoteSelections(prev => {
              const updated = { ...prev };
              delete updated[data.userId];
              return updated;
            });
          }
        } catch (error) {
          if (isComponentMounted) {
            setContent(event.data);
          }
        }
      };

      socketRef.current.onerror = (error) => {
        if (!isComponentMounted) return;
        console.error('WebSocket error:', error);
        setIsConnected(false);
        setIsLoading(false);
        
        if (socketRef.current) {
          socketRef.current.close();
          socketRef.current = null;
        }
      };
    };

    // Initialize connection
    connectWebSocket();

    // Cleanup
    return () => {
      isComponentMounted = false;
      clearTimeout(reconnectTimer);
      clearTimeout(connectionTimeout);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setRemoteSelections({});
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

  const handleWordWrapChange = (e) => {
    setWordWrap(e.target.value);
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
            <div className="active-users" title="Active Users">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              {activeUsers} user{activeUsers !== 1 ? 's' : ''}
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
              value={wordWrap}
              onChange={handleWordWrapChange}
              title="Word Wrap"
            >
              <option value="on">Wrap Text</option>
              <option value="off">No Wrap</option>
              <option value="wordWrapColumn">Wrap Column</option>
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
              <span className="timer-container-val" style={{ fontSize: '1.2em', fontWeight: 'bold', minWidth: '80px', textAlign: 'center', color: '#e0e0e0' }}>{Math.floor(timer / 3600).toString().padStart(2, '0')}:
                {Math.floor((timer % 3600) / 60).toString().padStart(2, '0')}:
                {(timer % 60).toString().padStart(2, '0')}
              </span>
              <div className="timer-controls" style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="icon-button" 
                  onClick={startTimer}
                  title="Start"
                  style={{ 
                    width: '32px', 
                    height: '32px',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: timerRunning ? '#4caf50' : '#2a2a2a',
                    border: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Play icon - simple triangle */}
                  <div style={{
                    width: 0, 
                    height: 0, 
                    borderTop: '8px solid transparent',
                    borderBottom: '8px solid transparent',
                    borderLeft: '12px solid #e0e0e0',
                    marginLeft: '2px'
                  }}></div>
                </button>
                <button 
                  className="icon-button" 
                  onClick={pauseTimer}
                  title="Pause"
                  style={{ 
                    width: '32px', 
                    height: '32px',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: !timerRunning && timer > 0 ? '#ff9800' : '#2a2a2a',
                    border: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Pause icon - two rectangles */}
                  <div style={{
                    display: 'flex',
                    gap: '4px'
                  }}>
                    <div style={{
                      width: '4px',
                      height: '16px',
                      backgroundColor: '#e0e0e0'
                    }}></div>
                    <div style={{
                      width: '4px',
                      height: '16px',
                      backgroundColor: '#e0e0e0'
                    }}></div>
                  </div>
                </button>
                <button 
                  className="icon-button" 
                  onClick={resetTimer}
                  title="Reset"
                  style={{ 
                    width: '32px', 
                    height: '32px',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: '#2a2a2a',
                    border: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Reset icon - simple text symbol that's universally recognized */}
                  <span style={{
                    fontSize: '18px', 
                    color: '#e0e0e0', 
                    fontWeight: 'bold',
                    lineHeight: '18px'
                  }}>
                    ↺
                  </span>
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
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;
                
                // Setup model change and selection listeners
                let decorationTimeout;
                
                // Function to update decorations
                const updateDecorations = () => {
                  try {
                    const decorations = Object.entries(remoteSelections).map(([userId, selection]) => ({
                      range: new monaco.Range(
                        selection.startLineNumber,
                        selection.startColumn,
                        selection.endLineNumber,
                        selection.endColumn
                      ),
                      options: {
                        className: 'remote-selection',
                        inlineClassName: 'remote-selection-inline',
                        hoverMessage: { value: `Selection by user ${userId}` },
                        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                        zIndex: 100
                      }
                    }));
                    
                    if (decorations.length > 0) {
                      decorationsRef.current = editor.deltaDecorations(
                        decorationsRef.current,
                        decorations
                      );
                    }
                  } catch (error) {
                    console.error('Error applying decorations:', error);
                  }
                };

                // Handle model changes
                const modelChangeDisposable = editor.onDidChangeModel(() => {
                  if (!editor.getModel()) return;
                  clearTimeout(decorationTimeout);
                  decorationTimeout = setTimeout(updateDecorations, 100);
                });

                // Handle selection changes
                const selectionDisposable = editor.onDidChangeCursorSelection((e) => {
                  if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
                  
                  const selection = e.selection;
                  const hasSelection = 
                    selection.startLineNumber !== selection.endLineNumber || 
                    selection.startColumn !== selection.endColumn;
                  
                  try {
                    if (hasSelection) {
                      const selectionEvent = {
                        type: 'selection',
                        selection: {
                          startLineNumber: selection.startLineNumber,
                          startColumn: selection.startColumn,
                          endLineNumber: selection.endLineNumber,
                          endColumn: selection.endColumn
                        },
                        userId: socketRef.current.clientId
                      };
                      
                      // Update local state immediately for better responsiveness
                      setRemoteSelections(prev => ({
                        ...prev,
                        [socketRef.current.clientId]: {
                          ...selectionEvent.selection,
                          userId: socketRef.current.clientId
                        }
                      }));
                      
                      // Send to other clients
                      socketRef.current.send(JSON.stringify(selectionEvent));
                    } else if (e.oldSelections?.some(s => 
                      s.startLineNumber !== s.endLineNumber || 
                      s.startColumn !== s.endColumn)) {
                      // Clear selection if it was previously a selection
                      const clearEvent = { 
                        type: 'selection_clear',
                        userId: socketRef.current.clientId 
                      };
                      
                      // Update local state
                      setRemoteSelections(prev => {
                        const newSelections = { ...prev };
                        delete newSelections[socketRef.current.clientId];
                        return newSelections;
                      });
                      
                      // Send to other clients
                      socketRef.current.send(JSON.stringify(clearEvent));
                    }
                  } catch (error) {
                    console.error('Error handling selection change:', error);
                  }
                });
                
                // Initial decorations update
                updateDecorations();
                
                // Cleanup function
                return () => {
                  // Dispose of all disposables
                  modelChangeDisposable && modelChangeDisposable.dispose();
                  selectionDisposable && selectionDisposable.dispose();
                  clearTimeout(decorationTimeout);
                  
                  // Clear any existing decorations
                  if (decorationsRef.current.length > 0) {
                    editor.deltaDecorations(decorationsRef.current, []);
                    decorationsRef.current = [];
                  }
                };
              }}
              options={{
                minimap: { enabled: showMinimap },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: wordWrap,
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
