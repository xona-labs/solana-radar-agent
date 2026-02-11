FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Create data directory for signal/narrative persistence
RUN mkdir -p /app/data

EXPOSE 3010

CMD ["node", "index.js"]
