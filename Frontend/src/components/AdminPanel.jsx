import React, { useState, useEffect } from 'react';
import config from '../config';
import './AdminPanel.css';

const ADMIN_PASSCODE = 'admin123'; // This should be stored securely in production

const MODES = {
  VIEW_LIST: 'view_list',
  VIEW_NOTE: 'view_note',
  CREATE: 'create',
  EDIT: 'edit'
};

function AdminPanel({ isOpen, onClose, onResize }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [contents, setContents] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [panelWidth, setPanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [mode, setMode] = useState(MODES.VIEW_LIST);
  const [editForm, setEditForm] = useState({ title: '', content: '' });

  useEffect(() => {
    if (isAuthenticated) {
      fetchContents();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isOpen) {
      onResize(panelWidth);
    } else {
      onResize(0);
    }
  }, [panelWidth, isOpen, onResize]);

  const fetchContents = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/admin/content`);
      if (!response.ok) throw new Error('Failed to fetch content');
      const data = await response.json();
      setContents(data.content || []);
    } catch (err) {
      setError('Failed to load content');
    }
  };

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    if (passcode === ADMIN_PASSCODE) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid passcode');
      setPasscode('');
    }
  };

  const handleContentClick = async (contentId) => {
    try {
      const response = await fetch(`${config.apiUrl}/admin/content?content_id=${contentId}`);
      if (!response.ok) throw new Error('Failed to fetch content');
      const data = await response.json();
      setSelectedContent(data.content);
      setMode(MODES.VIEW_NOTE);
    } catch (err) {
      setError('Failed to load content details');
    }
  };

  const handleCreateContent = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${config.apiUrl}/admin/content?title=${encodeURIComponent(editForm.title)}&content=${encodeURIComponent(editForm.content)}`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to create content');
      
      await fetchContents();
      setMode(MODES.VIEW_LIST);
      setEditForm({ title: '', content: '' });
      setError('');
    } catch (err) {
      setError('Failed to create content');
    }
  };

  const handleUpdateContent = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${config.apiUrl}/admin/content/${selectedContent.id}?title=${encodeURIComponent(editForm.title)}&content=${encodeURIComponent(editForm.content)}`, {
        method: 'PUT',
      });
      
      if (!response.ok) throw new Error('Failed to update content');
      
      await fetchContents();
      const updatedContent = { ...selectedContent, ...editForm };
      setSelectedContent(updatedContent);
      setMode(MODES.VIEW_NOTE);
      setError('');
    } catch (err) {
      setError('Failed to update content');
    }
  };

  const handleDeleteContent = async (contentId) => {
    if (!window.confirm('Are you sure you want to delete this content?')) return;
    
    try {
      const response = await fetch(`${config.apiUrl}/admin/content/${contentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete content');
      
      await fetchContents();
      setSelectedContent(null);
      setMode(MODES.VIEW_LIST);
      setError('');
    } catch (err) {
      setError('Failed to delete content');
    }
  };

  const startResizing = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const handleResize = (e) => {
    if (isResizing) {
      const windowWidth = window.innerWidth;
      const newWidth = windowWidth - e.clientX;
      const clampedWidth = Math.max(300, Math.min(800, newWidth));
      setPanelWidth(clampedWidth);
    }
  };

  const startEdit = (content) => {
    setEditForm({ title: content.title, content: content.content });
    setMode(MODES.EDIT);
  };

  const startCreate = () => {
    setEditForm({ title: '', content: '' });
    setMode(MODES.CREATE);
    setSelectedContent(null);
  };

  const goBack = () => {
    setMode(MODES.VIEW_LIST);
    setSelectedContent(null);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResizing);
    }
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  if (!isOpen) return null;

  const renderContentForm = () => (
    <form onSubmit={mode === MODES.CREATE ? handleCreateContent : handleUpdateContent} className="content-form">
      <div className="form-header">
        <button type="button" className="back-button" onClick={goBack}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <h3>{mode === MODES.CREATE ? 'Create New Note' : 'Edit Note'}</h3>
      </div>
      <input
        type="text"
        value={editForm.title}
        onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
        placeholder="Enter title"
        className="content-input"
        required
      />
      <textarea
        value={editForm.content}
        onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
        placeholder="Enter content"
        className="content-textarea"
        required
      />
      <div className="form-buttons">
        <button type="submit" className="submit-button">
          {mode === MODES.CREATE ? 'Create' : 'Update'}
        </button>
        <button type="button" className="cancel-button" onClick={goBack}>
          Cancel
        </button>
      </div>
    </form>
  );

  const renderNoteView = () => (
    <div className="note-view">
      <div className="note-header">
        <button className="back-button" onClick={goBack}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Notes
        </button>
        <div className="note-actions">
          <button 
            className="edit-button"
            onClick={() => startEdit(selectedContent)}
          >
            Edit
          </button>
          <button 
            className="delete-button"
            onClick={() => handleDeleteContent(selectedContent.id)}
          >
            Delete
          </button>
        </div>
      </div>
      <h2 className="note-title">{selectedContent.title}</h2>
      <div className="note-content">{selectedContent.content}</div>
    </div>
  );

  const renderNotesList = () => (
    <div className="notes-list-view">
      <div className="content-actions">
        <button 
          className="action-button"
          onClick={startCreate}
        >
          Create New Note
        </button>
      </div>
      <div className="notes-list">
        {contents.length === 0 ? (
          <div className="empty-state">
            No notes yet. Click "Create New Note" to add one.
          </div>
        ) : (
          contents.map((content) => (
            <div
              key={content.id}
              className="note-item"
              onClick={() => handleContentClick(content.id)}
            >
              <h3 className="note-item-title">{content.title}</h3>
              <p className="note-item-preview">
                {content.content.substring(0, 100)}
                {content.content.length > 100 ? '...' : ''}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div 
      className="admin-panel" 
      style={{ width: `${panelWidth}px` }}
      onMouseMove={handleResize}
    >
      <div className="admin-panel-resizer" onMouseDown={startResizing} />
      
      <div className="admin-panel-header">
        <h2>Admin Panel</h2>
        <button className="close-button" onClick={onClose}>
          <span className="info-icon">ⓘ</span>
        </button>
      </div>

      {!isAuthenticated ? (
        <div className="passcode-section">
          <form onSubmit={handlePasscodeSubmit}>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter admin passcode"
              className="passcode-input"
            />
            <button type="submit" className="submit-button">
              Submit
            </button>
          </form>
          {error && <div className="error-message">{error}</div>}
        </div>
      ) : (
        <div className="content-section">
          {mode === MODES.VIEW_LIST && renderNotesList()}
          {mode === MODES.VIEW_NOTE && renderNoteView()}
          {(mode === MODES.CREATE || mode === MODES.EDIT) && renderContentForm()}
          {error && <div className="error-message">{error}</div>}
        </div>
      )}
    </div>
  );
}

export default AdminPanel; 