FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ netcat-openbsd

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Build both frontend and backend for production
RUN npm run build:all

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3069

EXPOSE 3069

# Start the production backend server
CMD ["npm", "run", "start"]
