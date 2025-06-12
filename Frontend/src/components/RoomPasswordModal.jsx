import React, { useState } from 'react';
import './RoomPasswordModal.css';
import config from '../config';

const RoomPasswordModal = ({ roomName, onSuccess, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${config.apiUrl}/room/${roomName}/validate-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.valid) {
        onSuccess();
      } else {
        setError(data.message || 'Invalid password');
      }
    } catch (err) {
      setError('Failed to validate password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="password-modal-overlay">
      <div className="password-modal">
        <div className="password-modal-header">
          <h2>Room Access</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        <div className="password-modal-content">
          <p>This room is locked. Please enter the password to continue.</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter password"
                autoFocus
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="modal-actions">
              <button 
                type="button" 
                className="cancel-button" 
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="submit-button" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Validating...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoomPasswordModal;
