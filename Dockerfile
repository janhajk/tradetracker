# V1.0.2
FROM node:latest

ENV USERNAME="admin" \
    PASSWORD="9B*53P5E&SZK" \
    REP="https://github.com/janhajk/tradetracker.git"

RUN apt-get update && \
apt-get install -y git

# Create app directory
WORKDIR /usr/src/app

RUN git clone $REP /usr/src/app


RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
#COPY . .

EXPOSE 8080
CMD node app.js 8080 1