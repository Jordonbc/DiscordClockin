# Use an official Node.js image as the base
FROM node:22-alpine

# Install PM2 globally
RUN npm install -g pm2

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies first
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the entire project to the container's working directory
COPY . .

# Use PM2 to manage the app
CMD ["pm2-runtime", "src/index.js"]
