FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY --from=build /app/dist ./dist
RUN mkdir -p uploads

EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
