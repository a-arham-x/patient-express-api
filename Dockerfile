# Choose a base Node.js image
FROM node:14

# Set the working directory inside the container
WORKDIR /app

# Copy your Express API code to the container
COPY . /app

# Install dependencies
RUN npm install

# Expose the port your Express API runs on
EXPOSE 5000

# Set environment variables
ENV PG_HOST postgres
ENV PG_USER postgres
ENV PG_PASSWORD abdularham123
ENV PG_DATABASE Patient Schema
ENV ES_HOST http://elastic-container:9200

# Build and run your Express API
CMD ["node", "app.js"]
