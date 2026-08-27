# STAGE 1: Build the React application using Node.js
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (leverages Docker cache)
COPY package*.json ./
RUN npm install

# Copy all source code and build the production assets
COPY . .
RUN npm run build

# STAGE 2: Serve the optimized build using Nginx
FROM nginx:alpine

# Copy the built files from Stage 1 into Nginx's serving directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 inside the container
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]