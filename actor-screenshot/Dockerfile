FROM apify/actor-node-playwright-chrome:22
COPY --chown=myuser package*.json ./
RUN npm --quiet set progress=false && npm install --omit=dev --no-audit
COPY --chown=myuser . ./
CMD ["node", "src/main.js"]
