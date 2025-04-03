from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Set
from database import Database

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

# In-memory storage for active WebSocket connections only
active_connections: Dict[str, Set[WebSocket]] = {}

@app.post("/create_room")
async def create_room(room_name: str):
    if db.create_room(room_name):
        active_connections[room_name] = set()
        return {"message": "Room created", "room_name": room_name}
    raise HTTPException(status_code=400, detail="Room already exists")

@app.get("/rooms")
async def get_rooms():
    return {"rooms": db.get_all_rooms()}

@app.delete("/delete_room/{room_name}")
async def delete_room(room_name: str):
    if db.delete_room(room_name):
        if room_name in active_connections:
            del active_connections[room_name]
        return {"message": "Room deleted"}
    raise HTTPException(status_code=404, detail="Room not found")

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
    
    # Add the new connection to the room's active connections
    active_connections[room_name].add(websocket)
    
    try:
        # Send current content to the new client
        content = db.get_room_content(room_name) or ""
        await websocket.send_text(content)
        
        while True:
            data = await websocket.receive_text()
            # Update content in database
            db.update_room_content(room_name, data)
            
            # Broadcast to all other clients in the room
            for client in active_connections[room_name]:
                if client != websocket:
                    await client.send_text(data)
    except WebSocketDisconnect:
        active_connections[room_name].remove(websocket)
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

# For production deployment
if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info", reload=True)