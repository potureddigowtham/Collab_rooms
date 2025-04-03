import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const [rooms, setRooms] = useState([]);
  const [newRoom, setNewRoom] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:8000/rooms')
      .then((res) => res.json())
      .then((data) => setRooms(data.rooms));
  }, []);

  const createRoom = () => {
    fetch('http://localhost:8000/create_room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_name: newRoom }),
    }).then(() => {
      setRooms([...rooms, newRoom]);
      setNewRoom('');
    });
  };

  const deleteRoom = (roomName) => {
    fetch(`http://localhost:8000/delete_room/${roomName}`, { method: 'DELETE' })
      .then(() => setRooms(rooms.filter((room) => room !== roomName)));
  };

  return (
    <div>
      <h1>Collaboration Rooms</h1>
      <input value={newRoom} onChange={(e) => setNewRoom(e.target.value)} placeholder="New Room Name" />
      <button onClick={createRoom}>Create Room</button>
      <ul>
        {rooms.map((room) => (
          <li key={room}>
            {room}
            <button onClick={() => navigate(`/editor/${room}`)}>Join</button>
            <button onClick={() => deleteRoom(room)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Home;
