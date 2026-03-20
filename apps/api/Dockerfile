FROM node:20-alpine AS base
WORKDIR /app

COPY package.json /app/package.json
COPY apps/api/package.json /app/apps/api/package.json
RUN npm install

COPY apps/api /app/apps/api
WORKDIR /app/apps/api
RUN npm run build

EXPOSE 8080
CMD ["npm", "run", "start"]
