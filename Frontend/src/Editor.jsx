import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import './Editor.css';

function CodeEditor() {
  const { roomName } = useParams();
  const [content, setContent] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = React.useRef(null);

  useEffect(() => {
    // Only create a new connection if one doesn't exist
    if (!socketRef.current) {
      socketRef.current = new WebSocket(`ws://localhost:8000/ws/${roomName}`);
      
      socketRef.current.onopen = () => {
        setIsConnected(true);
      };

      socketRef.current.onclose = () => {
        setIsConnected(false);
      };

      socketRef.current.onmessage = (event) => {
        setContent(event.data);
      };

      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [roomName]);

  const handleEditorChange = (value) => {
    setContent(value);
    if (socketRef.current && isConnected) {
      socketRef.current.send(value);
    }
  };

  return (
    <div className="editor-container">
      <div className="editor-header">
        <h1>Editing Room: {roomName}</h1>
        <div className="connection-status">
          Connection status: {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      <div className="editor-content">
        <Editor
          height="100%"
          defaultLanguage="plaintext"
          theme="vs-dark"
          value={content}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
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
          }}
        />
      </div>
    </div>
  );
}

export default CodeEditor;
