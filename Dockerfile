FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
EXPOSE 8080
CMD ["sh", "-c", "node migrate.js && node server.js"]
