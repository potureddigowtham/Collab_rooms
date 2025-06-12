import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import config from './config';
import RoomPasswordModal from './components/RoomPasswordModal';
import './Home.css';

function Home() {
  const [rooms, setRooms] = useState([]);
  const [newRoom, setNewRoom] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/rooms`);
      if (!response.ok) throw new Error('Failed to fetch rooms');
      const data = await response.json();
      // Defensive: sort by created_at descending (latest first)
      const sortedRooms = [...data.rooms].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRooms(sortedRooms);
    } catch (err) {
      setError('Failed to load rooms. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateRoomName = (name) => {
    if (!name.trim()) {
      return 'Room name cannot be empty';
    }
    if (name.length < 3) {
      return 'Room name must be at least 3 characters long';
    }
    if (rooms.some(r => r.room_name === name)) {
      return 'Room name already exists';
    }
    return '';
  };

  const createRoom = async () => {
    const validationError = validateRoomName(newRoom);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await fetch(`${config.apiUrl}/create_room?room_name=${encodeURIComponent(newRoom)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      // After creation, refetch rooms to get correct created_at
      fetchRooms();
      setNewRoom('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteRoom = async (roomName) => {
    try {
      const response = await fetch(`${config.apiUrl}/delete_room/${roomName}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete room');
      }

      setRooms(rooms.filter((room) => room.room_name !== roomName));
    } catch (err) {
      setError('Failed to delete room. Please try again.');
    }
  };
  
  const toggleRoomLock = async (roomName, currentLockState) => {
    setIsTogglingLock(true);
    try {
      const response = await fetch(`${config.apiUrl}/room/${roomName}/lock?locked=${!currentLockState}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to update room lock status');
      }

      // Update the rooms array with the new lock status
      setRooms(rooms.map(room => 
        room.room_name === roomName 
          ? { ...room, is_locked: !currentLockState } 
          : room
      ));
    } catch (err) {
      setError('Failed to update room lock status. Please try again.');
    } finally {
      setIsTogglingLock(false);
    }
  };
  
  const handleJoinRoom = (room) => {
    // If room is locked, show password modal
    if (room.is_locked) {
      setSelectedRoom(room.room_name);
      setShowPasswordModal(true);
    } else {
      // If room is not locked, navigate directly
      navigate(`/editor/${room.room_name}`);
    }
  };
  
  const handlePasswordSuccess = () => {
    setShowPasswordModal(false);
    navigate(`/editor/${selectedRoom}`);
  };
  
  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    setSelectedRoom(null);
  };

  if (isLoading) {
    return (
      <div className="home-container">
        <div className="loading">Loading rooms...</div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>TechpathAI Rooms</h1>
      </div>
      
      <div className="create-room-section">
        <input
          className="create-room-input"
          type="text"
          value={newRoom}
          onChange={(e) => {
            setNewRoom(e.target.value);
            setError('');
          }}
          placeholder="Enter room name"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !isCreating) {
              createRoom();
            }
          }}
          disabled={isCreating}
          autoFocus
        />
        <button
          className="create-room-button"
          onClick={createRoom}
          disabled={!newRoom.trim() || isCreating}
        >
          {isCreating ? 'Creating...' : 'Create Room'}
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}

      <div className="room-search-section">
        <input
          className="room-search-input"
          type="text"
          placeholder="Search rooms..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rooms-grid">
        {rooms.length === 0 ? (
          <div className="room-card" style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
              No rooms available. Create your first room to get started!
            </p>
          </div>
        ) : (
          rooms
            .filter(room => room.room_name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((room) => (
              <div key={room.room_name} className="room-card">
                <div className="room-name">{room.room_name}</div>
                <div className="room-meta" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Created: {room.created_at ? new Date(room.created_at).toLocaleString() : 'N/A'}
                </div>
                <div className="room-lock-toggle">
                  <label className="lock-switch">
                    <input
                      type="checkbox"
                      checked={room.is_locked}
                      onChange={() => toggleRoomLock(room.room_name, room.is_locked)}
                      disabled={isTogglingLock}
                    />
                    <span className="lock-slider">
                      <span className="lock-status">
                        {room.is_locked ? 'Locked' : 'Unlocked'}
                      </span>
                    </span>
                  </label>
                </div>
                <div className="room-actions">
                  <button
                    className="join-button"
                    onClick={() => handleJoinRoom(room)}
                    aria-label="Join Room"
                    title="Join Room"
                  >
                    Join
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => deleteRoom(room.room_name)}
                    aria-label="Delete Room"
                    title="Delete Room"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
      
      {showPasswordModal && (
        <RoomPasswordModal
          roomName={selectedRoom}
          onSuccess={handlePasswordSuccess}
          onCancel={handlePasswordCancel}
        />
      )}
    </div>
  );
}

export default Home;
