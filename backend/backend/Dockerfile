# Node 24: geoip-lite (visitor country lookup) requires Node >= 24; Node 18 is end-of-life.
FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

# Dependencies first (cached layer). Dev tools are not installed.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Only the application code goes into the image: no .env, logs or scratch files
# (see .dockerignore). Secrets are passed at run time by the host / dashboard.
COPY --chown=node:node src ./src
COPY --chown=node:node server.js ./

# Do not run as root.
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
