FROM node:18-alpine

WORKDIR /server
# Copy root package.json and lockfile
COPY package.json yarn.loc[k] ./

RUN yarn install

# Copy app source
COPY . .

RUN yarn build

EXPOSE 4001

CMD [ "yarn", "start" ]