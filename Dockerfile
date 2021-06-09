FROM node:14.17-alpine

WORKDIR /usr/local/share/app

ADD package-lock.json package.json ./
RUN npm install --frozen

ADD index.js ./

CMD ["node", "index.js"]