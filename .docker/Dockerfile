FROM node:18-alpine

WORKDIR /app
COPY package.json ./
COPY prisma ./prisma
COPY ../.docker/env.docker .env

RUN npm install

COPY .. .

CMD ["npm", "run", "dev"]