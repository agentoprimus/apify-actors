FROM apify/actor-node-playwright-chrome:22
COPY --chown=myuser package*.json ./
RUN npm --quiet set progress=false && npm install --omit=dev --no-audit && echo "Installed:" && npm ls --omit=dev --depth=0
COPY --chown=myuser . ./
CMD ["node", "src/main.js"]
