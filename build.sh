#!/bin/bash

# Ensure we exit on any error
set -e

echo "🔨 Building Tauri application..."

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t tauri-builder .

# Create cache directories if they don't exist
mkdir -p "$HOME/.cargo/registry"
mkdir -p "$HOME/.cargo/git"
mkdir -p "$HOME/.local/share/pnpm"

# Get current user and group IDs
USER_ID=$(id -u)
GROUP_ID=$(id -g)

# Run the container with the current directory mounted
echo "🚀 Starting build process..."
docker run -it --rm \
    -v "$(pwd)/front":/app/front \
    -v "$(pwd)/dataset":/app/dataset \
    -v "$(pwd)/back":/app/back \
    -v "$HOME/.cargo/registry":/root/.cargo/registry \
    -v "$HOME/.cargo/git":/root/.cargo/git \
    -v "$HOME/.local/share/pnpm":/root/.local/share/pnpm \
    tauri-builder \
    bash -c "cd front && \
             pnpm config set store-dir /root/.local/share/pnpm && \
             pnpm install && \
             cargo tauri build"

echo "✨ Build process completed!"
