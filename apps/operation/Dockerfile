# Development Stage
FROM node:lts-alpine as development
WORKDIR /usr/src/app

# Set options for memory allocation
ENV NODE_OPTIONS=--max-old-space-size=8192

# Install pnpm globally and necessary build dependencies
RUN npm i -g pnpm @nestjs/cli

# Copy package files
COPY package.json ./
COPY pnpm-lock.yaml ./

# Install all dependencies (including devDependencies)
RUN pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production Stage
FROM node:lts-alpine as production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

# Install pnpm globally
RUN npm i -g pnpm

# Copy package files
COPY package.json ./
COPY pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --prod

# Copy built assets from development stage
COPY --from=development /usr/src/app/dist ./dist

CMD [ "node", "dist/apps/operation/main.js" ]