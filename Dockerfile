FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY circuits ./circuits
# /data is a platform-managed persistent volume (Railway bans the VOLUME keyword).
ENV NODE_ENV=production DATA_DIR=/data PORT=8080
EXPOSE 8080
CMD ["node", "src/server.js"]
