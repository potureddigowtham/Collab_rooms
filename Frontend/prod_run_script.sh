#!/bin/bash

# Build the React app for production with production environment variables
echo "Building the React app for production..."
npm run build:prod

# Serve the built app using serve
echo "Starting production server on http://0.0.0.0:3000..."
# For your version of serve, use the -l flag with the format host:port
nohup serve -s dist -l tcp://0.0.0.0:3000 &

echo "React app is running in production mode on http://0.0.0.0:3000"


# run prod locally

npm run build:prod
npx serve -s dist -l tcp://0.0.0.0:3000