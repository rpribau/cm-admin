# Dockerfile for Next.js application

# Stage 1: Install dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package.json ./
# Assuming npm, if you use yarn or pnpm, adjust accordingly
# COPY yarn.lock ./
# COPY pnpm-lock.yaml ./

# Install dependencies
RUN npm install --frozen-lockfile

# Stage 2: Build the application
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies from the deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1

# Build the Next.js application
RUN npm run build

# Stage 3: Production image
FROM node:18-alpine AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder package.json ./
COPY --from=builder next.config.mjs ./

# The Next.js app router uses a server.js file in the standalone output
# If you are using the pages router, you might need to adjust this.

# Change ownership of copied files to the non-root user
# This is handled by --chown in the COPY commands for .next/standalone and .next/static
# For other files, ensure they are accessible by the nextjs user if needed.
# RUN chown -R nextjs:nodejs /app

# Switch to the non-root user
USER nextjs

EXPOSE 3000

ENV PORT 3000

# Start the Next.js application
# The standalone output includes a server.js file
CMD ["node", "server.js"]
