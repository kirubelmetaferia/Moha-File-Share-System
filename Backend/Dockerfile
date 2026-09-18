FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

# Generate Prisma Client
RUN npx prisma generate

# Copy built code from builder
COPY --from=builder /app/dist ./dist

# Create directories for volumes
RUN mkdir -p logs uploads

EXPOSE 5000

CMD ["npm", "start"]
