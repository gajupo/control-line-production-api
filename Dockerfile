# Tell Docker to use the "node" Docker Image at version "lts-slim"
FROM node:14-slim
#install curl for dev tasks
RUN apt-get update && apt-get install -y curl
# Create our containers WORKDIR and "node_modules" directory.
# Give the user:group "node" ownership of all files/directories in our containers WORKDIR
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
# Tell our container which directory to use as the WORKDIR
WORKDIR /home/node/app
# Copy over our local version of "package.json" and "package-lock.json" into our container
COPY package*.json ./
# Creates a user for our container
USER node
# Installs our NPM packages from the "package.json" file we moved from local in to our container
RUN npm install
# Bundle app source
COPY dist/api.bundle.js .
# Tells our container who owns the copied content
COPY --chown=node:node . .
# Port for production environments
EXPOSE 80
# An array of commands our container needs to run when we start it
CMD [ "npm", "run", "prod" ]