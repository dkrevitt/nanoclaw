# NanoClaw Host Process
# Orchestrates agent containers via Docker

FROM node:22-slim

# Install Docker CLI (for spawning agent containers)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy built files
COPY dist/ ./dist/

# Copy container build context (for building agent image)
COPY container/ ./container/

# Create directories
RUN mkdir -p data groups store

# Run as non-root
RUN useradd -m nanoclaw && chown -R nanoclaw:nanoclaw /app
USER nanoclaw

CMD ["node", "dist/index.js"]
