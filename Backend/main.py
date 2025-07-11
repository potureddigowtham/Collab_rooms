from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Set, Optional
from database import Database
import os
from pydantic import BaseModel
import json

# Global password for locked rooms
ROOM_PASSWORD = os.environ.get("ROOM_PASSWORD", "TechPathAi24")

# Password validation model
class PasswordValidation(BaseModel):
    password: str

app = FastAPI()

# Initialize database
db = Database()

# Allow CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active WebSocket connections and their IDs
active_connections: Dict[str, Set[WebSocket]] = {}
client_ids: Dict[WebSocket, str] = {}

import uuid

# Generate unique client ID
def generate_client_id() -> str:
    return str(uuid.uuid4())

@app.post("/create_room")
async def create_room(room_name: str):
    if db.create_room(room_name):
        active_connections[room_name] = set()
        return {"message": "Room created", "room_name": room_name}
    raise HTTPException(status_code=400, detail="Room already exists")

# Returns a list of rooms with room_name and created_at (latest first)
@app.get("/rooms")
async def get_rooms(auto_lock_old: bool = True):
    # If auto_lock_old is True, automatically lock rooms older than 30 days
    locked_count = 0
    if auto_lock_old:
        locked_count = db.lock_rooms_older_than_days(30)
    
    return {
        "rooms": db.get_all_rooms(),
        "auto_locked_count": locked_count
    }

@app.post("/auto-lock-old-rooms")
async def auto_lock_old_rooms(days: int = 30):
    """Manually trigger locking of rooms older than the specified number of days"""
    locked_count = db.lock_rooms_older_than_days(days)
    return {
        "message": f"Auto-locked {locked_count} rooms older than {days} days",
        "locked_count": locked_count
    }

@app.delete("/delete_room/{room_name}")
async def delete_room(room_name: str):
    if db.delete_room(room_name):
        if room_name in active_connections:
            del active_connections[room_name]
        return {"message": "Room deleted"}
    raise HTTPException(status_code=404, detail="Room not found")

async def broadcast_user_count(room_name: str):
    """Broadcast the current number of users to all clients in a room."""
    if room_name in active_connections:
        user_count = len(active_connections[room_name])
        message = json.dumps({
            "type": "users",
            "count": user_count
        })
        for client in active_connections[room_name]:
            try:
                await client.send_text(message)
            except:
                pass  # Ignore failed sends

@app.websocket("/ws/{room_name}")
async def websocket_endpoint(websocket: WebSocket, room_name: str):
    await websocket.accept()
    
    # Get or create room
    room = db.get_room(room_name)
    if not room:
        if not db.create_room(room_name):
            await websocket.close()
            return
    
    # Initialize active connections for the room if needed
    if room_name not in active_connections:
        active_connections[room_name] = set()
    
    # Generate unique client ID for this connection
    client_id = generate_client_id()
    client_ids[websocket] = client_id

    # Add the new connection to the room's active connections
    active_connections[room_name].add(websocket)
    
    # Broadcast updated user count
    await broadcast_user_count(room_name)
    
    # Debug log
    print(f"New client connected. ID: {client_id}, Room: {room_name}")
    
    try:
        # Send current content to the new client
        content = db.get_room_content(room_name) or ""
        await websocket.send_text(json.dumps({
            "type": "content",
            "content": content
        }))
        
        while True:
            data = await websocket.receive_text()
            try:
                # Parse message as JSON
                message = json.loads(data)
                if isinstance(message, dict) and "type" in message:
                    if message["type"] in ["selection", "selection_clear"]:
                        # Handle selection events
                        message["userId"] = client_ids[websocket]  # Add client ID to message
                        print(f"Selection event from {client_ids[websocket]}: {message}")  # Debug log
                        for client in active_connections[room_name]:
                            if client != websocket:
                                await client.send_text(json.dumps(message))
                    else:
                        # Handle content updates
                        content = message.get("content", data)
                        db.update_room_content(room_name, content)
                        content_message = json.dumps({
                            "type": "content",
                            "content": content
                        })
                        for client in active_connections[room_name]:
                            if client != websocket:
                                await client.send_text(content_message)
                else:
                    # Handle non-typed JSON messages as content
                    db.update_room_content(room_name, data)
                    content_message = json.dumps({
                        "type": "content",
                        "content": data
                    })
                    for client in active_connections[room_name]:
                        if client != websocket:
                            await client.send_text(content_message)
            except json.JSONDecodeError:
                # Handle plain text as content
                db.update_room_content(room_name, data)
                content_message = json.dumps({
                    "type": "content",
                    "content": data
                })
                for client in active_connections[room_name]:
                    if client != websocket:
                        await client.send_text(content_message)
    except WebSocketDisconnect:
        # Clean up client ID
        if websocket in client_ids:
            client_id = client_ids[websocket]
            del client_ids[websocket]
            print(f"Client disconnected. ID: {client_id}, Room: {room_name}")

        # Remove from active connections
        active_connections[room_name].remove(websocket)
        
        # Broadcast updated user count after disconnect
        await broadcast_user_count(room_name)
        
        # Clean up empty rooms from active_connections
        if not active_connections[room_name]:
            del active_connections[room_name]

@app.get("/ws/details")
async def get_details(room_name: str):
    room = db.get_room(room_name)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    print(active_connections)
    for i in active_connections:
        for j in active_connections[i]:
            print(j.values)

    return {
        "room": dict(room),
        "active_connections": len(active_connections.get(room_name, set()))
    }

# Admin content endpoints
@app.post("/admin/content")
async def create_admin_content(title: str, content: str):
    if db.add_admin_content(title, content):
        return {"message": "Content created", "title": title}
    raise HTTPException(status_code=400, detail="Failed to create content")

@app.get("/admin/content")
async def get_admin_content(content_id: int = None):
    content = db.get_admin_content(content_id)
    if content is None and content_id is not None:
        raise HTTPException(status_code=404, detail="Content not found")
    return {"content": content}

@app.put("/admin/content/{content_id}")
async def update_admin_content(content_id: int, title: str, content: str):
    if db.update_admin_content(content_id, title, content):
        return {"message": "Content updated", "id": content_id}
    raise HTTPException(status_code=404, detail="Content not found")

@app.delete("/admin/content/{content_id}")
async def delete_admin_content(content_id: int):
    if db.delete_admin_content(content_id):
        return {"message": "Content deleted"}
    raise HTTPException(status_code=404, detail="Content not found")

# Room locking endpoints
@app.put("/room/{room_name}/lock")
async def toggle_room_lock(room_name: str, locked: bool):
    """Toggle the lock status of a room"""
    room = db.get_room(room_name)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if db.toggle_room_lock(room_name, locked):
        return {"message": f"Room {room_name} {'locked' if locked else 'unlocked'}", "locked": locked}
    raise HTTPException(status_code=500, detail="Failed to update room lock status")

@app.get("/room/{room_name}/locked")
async def is_room_locked(room_name: str):
    """Check if a room is locked"""
    room = db.get_room(room_name)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    is_locked = db.is_room_locked(room_name)
    return {"locked": is_locked}

@app.post("/room/{room_name}/validate-password")
async def validate_room_password(room_name: str, validation: PasswordValidation):
    """Validate the password for a locked room"""
    room = db.get_room(room_name)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Check if room is locked
    if not db.is_room_locked(room_name):
        return {"valid": True, "message": "Room is not locked"}
    
    # Validate password
    if validation.password == ROOM_PASSWORD:
        return {"valid": True, "message": "Password is valid"}
    else:
        return {"valid": False, "message": "Invalid password"}
