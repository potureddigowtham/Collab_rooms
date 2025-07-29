import React, { useState, useEffect } from 'react';
import config from '../config';
import './InterviewNotesPanel.css';

const INTERVIEW_NOTES_PASSWORD = 'meet123';

function InterviewNotesPanel({ isOpen, onClose, onResize, roomName }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [panelWidth, setPanelWidth] = useState(400);
  const [isResizingHorizontal, setIsResizingHorizontal] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotes();
    }
  }, [isAuthenticated, roomName]);

  useEffect(() => {
    if (isOpen) {
      onResize(panelWidth);
    } else {
      onResize(0);
    }
  }, [panelWidth, isOpen, onResize]);

  const fetchNotes = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/interview-notes/${roomName}`);
      if (!response.ok) throw new Error('Failed to fetch notes');
      const data = await response.json();
      setNotes(data.notes?.content || '');
      setIsDirty(false);
    } catch (err) {
      setError('Failed to load notes');
    }
  };

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    if (passcode === INTERVIEW_NOTES_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid passcode');
      setPasscode('');
    }
  };

  const handleNotesChange = (e) => {
    setNotes(e.target.value);
    setIsDirty(true);

    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Set new timeout for auto-save
    const timeoutId = setTimeout(() => {
      handleSaveNotes();
    }, 5000);
    setSaveTimeout(timeoutId);
  };

  const handleSaveNotes = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/interview-notes/${roomName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: notes,
          password: INTERVIEW_NOTES_PASSWORD
        })
      });
      
      if (!response.ok) throw new Error('Failed to save notes');
      
      setIsDirty(false);
      setError('');
    } catch (err) {
      setError('Failed to save notes');
    }
  };

  const startResizing = (e) => {
    setIsResizingHorizontal(true);
    e.preventDefault();
  };

  const stopResizing = () => {
    setIsResizingHorizontal(false);
  };

  const handleHorizontalResize = (e) => {
    if (isResizingHorizontal) {
      const windowWidth = window.innerWidth;
      const newWidth = windowWidth - e.clientX;
      const clampedWidth = Math.max(300, Math.min(800, newWidth));
      setPanelWidth(clampedWidth);
      onResize(clampedWidth);
    }
  };

  useEffect(() => {
    if (isResizingHorizontal) {
      document.addEventListener('mousemove', handleHorizontalResize);
      document.addEventListener('mouseup', stopResizing);
    }
    return () => {
      document.removeEventListener('mousemove', handleHorizontalResize);
      document.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizingHorizontal]);

  if (!isOpen) return null;

  return (
    <div 
      className="interview-notes-panel" 
      style={{ width: `${panelWidth}px` }}
    >
      <div className="interview-notes-resizer-horizontal" onMouseDown={startResizing} />
      
      <div className="interview-notes-header">
        <h2>Interview Notes</h2>
        <div className="header-actions">
          {isDirty && (
            <button className="save-button" onClick={handleSaveNotes}>
              Save
            </button>
          )}
          <button className="close-button" onClick={onClose}>
            <span className="close-icon">×</span>
          </button>
        </div>
      </div>

      {!isAuthenticated ? (
        <div className="passcode-section">
          <form onSubmit={handlePasscodeSubmit}>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter interview notes passcode"
              className="passcode-input"
            />
            <button type="submit" className="submit-button">
              Submit
            </button>
          </form>
          {error && <div className="error-message">{error}</div>}
        </div>
      ) : (
        <div className="notes-section">
          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Enter interview notes here..."
            className="notes-textarea"
          />
          {error && <div className="error-message">{error}</div>}
        </div>
      )}
    </div>
  );
}

export default InterviewNotesPanel; 