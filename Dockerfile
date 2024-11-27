FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    file \
    libssl-dev \
    pkg-config \
    build-essential \
    libgtk-3-dev \
    libwebkit2gtk-4.0-dev \
    libwebkit2gtk-4.1-dev \
    libappindicator3-1=12.10.1+20.10.20200706.1-0ubuntu1 \
    libappindicator3-dev \
    librsvg2-dev \
    protobuf-compiler \
    libsoup-3.0-dev \
    libjavascriptcoregtk-4.0-dev \
    libglib2.0-dev \
    cmake \
    pkg-config \
    git \
    libclang-dev \
    patchelf \
    librsvg2-dev \
    libjavascriptcoregtk-4.1-dev

# Install latest Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install pnpm package manager
RUN npm install -g pnpm

# Install Rust toolchain and common tools
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Pre-install Tauri CLI
RUN . $HOME/.cargo/env && cargo install tauri-cli

# Set working directory
WORKDIR /app

# Default command
CMD ["bash"]
