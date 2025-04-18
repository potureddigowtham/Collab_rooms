import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
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
  const socketRef = React.useRef(null);

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

  const toggleMinimap = () => {
    setShowMinimap(!showMinimap);
  };

  const handleBack = () => {
    navigate('/');
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
      <div className="editor-header">
        <div className="editor-header-left">
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
          >
            <option value="12">Small</option>
            <option value="14">Medium</option>
            <option value="16">Large</option>
            <option value="18">Extra Large</option>
          </select>

          <button className="toolbar-button" onClick={toggleMinimap}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6M14 10l7-7M3 21h6v-6M4 14l7 7"/>
            </svg>
            {showMinimap ? 'Hide Minimap' : 'Show Minimap'}
          </button>
        </div>

        <Editor
          height="100%"
          defaultLanguage="plaintext"
          theme="vs-dark"
          value={content}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: showMinimap },
            fontSize: fontSize,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            renderWhitespace: 'selection',
            padding: { top: 16 },
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: false,
              verticalScrollbarSize: 14,
              horizontalScrollbarSize: 14,
              arrowSize: 30,
            },
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            wordBasedSuggestions: true,
            parameterHints: {
              enabled: true,
              cycle: true,
            },
            bracketPairColorization: {
              enabled: true,
            },
            guides: {
              indentation: true,
              bracketPairs: true,
            },
          }}
        />
      </div>
    </div>
  );
}

export default CodeEditor;
