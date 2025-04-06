import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import AdminPanel from './components/AdminPanel';
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
  const [fontSize, setFontSize] = useState(14);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [editorWidth, setEditorWidth] = useState('100%');
  const [language, setLanguage] = useState('plaintext');
  const [timezone, setTimezone] = useState('UTC');
  const [currentTime, setCurrentTime] = useState('');
  const [theme, setTheme] = useState('vs-dark');
  const [wordWrap, setWordWrap] = useState('on');
  const socketRef = React.useRef(null);

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

  const handleFontSizeChange = (e) => {
    setFontSize(Number(e.target.value));
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const handleTimezoneChange = (e) => {
    setTimezone(e.target.value);
  };

  const handleThemeChange = (e) => {
    setTheme(e.target.value);
  };

  const handleWordWrapChange = (e) => {
    setWordWrap(e.target.value);
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
              value={fontSize} 
              onChange={handleFontSizeChange}
              title="Font Size"
            >
              <option value="12">Small</option>
              <option value="14">Medium</option>
              <option value="16">Large</option>
              <option value="18">Extra Large</option>
            </select>

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
              value={theme}
              onChange={handleThemeChange}
              title="Editor Theme"
            >
              <option value="vs-dark">Dark</option>
              <option value="vs-light">Light</option>
              <option value="hc-black">High Contrast Dark</option>
              <option value="hc-light">High Contrast Light</option>
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
          </div>

          <Editor
            height="100%"
            defaultLanguage="plaintext"
            language={language}
            theme={theme}
            value={content}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: showMinimap },
              fontSize: fontSize,
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
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                verticalScrollbarSize: 14,
                horizontalScrollbarSize: 14,
                verticalHasArrows: true,
                scrollByPage: true,
              },
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
    </div>
  );
}

export default CodeEditor;
