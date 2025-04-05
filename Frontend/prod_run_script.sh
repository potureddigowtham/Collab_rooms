#!/bin/bash

# Build the React app for production
echo "Building the React app for production..."
npm run build

# Serve the built app using serve
echo "Starting production server on http://0.0.0.0:3000..."
# For your version of serve, use the -l flag with the format host:port
nohup serve -s dist -l tcp://0.0.0.0:3000 &


echo "React app is running in production mode on http://0.0.0.0:3000"