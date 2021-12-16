<<<<<<< HEAD
FROM node:14-alpine3.14

ENV TZ="Asia/Kolkata"
# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

RUN npm i -g pm2
EXPOSE 3000
=======
FROM node:14

ENV TZ="Asia/Kolkata"
# Create app directory
WORKDIR /usr/src/app
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list
RUN apt-get update && apt-get -y install google-chrome-stable
RUN mkdir -p /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
# If you are building your code for production
# RUN npm ci --only=production
RUN npm install
# Bundle app source
COPY . .

RUN npm i -g pm2
EXPOSE 3000
>>>>>>> 5dc029cd0e6ab87b55b153c4715d59459e9c46b4
CMD ["pm2-runtime", "app.js"]