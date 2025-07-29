# Technical Context

## Technology Stack

### Frontend
- **Framework**: React with Vite
- **Key Libraries**:
  - @monaco-editor/react: Code editor component
  - react-router-dom: For routing
  - socket.io-client: For WebSocket communication
- **Development Tools**:
  - ESLint for code quality
  - Vite for development and building

### Backend
- **Framework**: FastAPI (Python)
- **Key Libraries**:
  - python-socketio: For WebSocket handling
  - uvicorn: ASGI server
  - sqlite3: Database management
  - pydantic: Data validation

## Technical Architecture

### Frontend Structure
- Modern React application with component-based architecture
- Real-time communication via WebSocket
- Monaco editor integration for code editing
- Collaborative text highlighting with real-time synchronization
- Responsive design with CSS

### Backend Structure
- RESTful API endpoints for room management
- WebSocket endpoints for real-time collaboration
- SQLite database for data persistence
- CORS middleware for frontend communication

### Database Schema
1. **rooms table**
   - room_name (TEXT PRIMARY KEY)
   - content (TEXT)
   - is_locked (BOOLEAN)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

2. **admin_content table**
   - id (INTEGER PRIMARY KEY)
   - title (TEXT)
   - content (TEXT)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

## Development Setup
- Frontend runs on port 3000
- Backend runs on port 8000
- Supports both development and production environments
- Environment variables control API and WebSocket URLs
