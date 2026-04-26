FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm install --omit=dev
COPY . .
EXPOSE 4000
CMD ["node", "src/index.js"]
