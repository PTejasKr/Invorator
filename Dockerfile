FROM node:22-bookworm-slim

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# installs, work.
RUN apt-get update \
    && apt-get install -y wget gnupg python3 make g++ \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend dependencies
COPY backend/package*.json ./backend/

# Install backend dependencies
RUN cd backend && npm ci

# Copy frontend dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Copy frontend build to backend static folder (we need to configure express to serve it)
RUN cp -r dist backend/public

# Start the server
WORKDIR /app/backend
EXPOSE 8080
ENV PORT=8080
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

CMD ["node", "server.js"]
