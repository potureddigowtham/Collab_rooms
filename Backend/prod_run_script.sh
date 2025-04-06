#!/bin/bash

# Initialize the database

# Start the FastAPI server
echo "Starting FastAPI server..."
nohup uvicorn main:app --host 0.0.0.0 --port 8000 &

echo "Backend server is running on http://0.0.0.0:8000" 