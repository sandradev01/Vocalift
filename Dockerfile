# Use an official Python image with Rust tools
FROM python:3.10-slim

# Install Rust and build tools
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    git \
    libssl-dev \
    pkg-config \
    && curl https://sh.rustup.rs -sSf | sh -s -- -y \
    && . $HOME/.cargo/env \
    && rustup update

# Copy your repo into the image
WORKDIR /app
COPY . .

# Install Python deps (Rust library first)
RUN pip install setuptools-rust
RUN pip install ./deepfilternet/pyDF
RUN pip install -r requirements.txt

# Expose a port (e.g. 10000)
EXPOSE 10000

# Start your server
CMD gunicorn app:app --bind 0.0.0.0:10000
