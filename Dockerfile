###########
# BUILDER #
###########

# base image
FROM node:10.4.1-alpine as BUILDER

# set working directory
WORKDIR /usr/src/app

# install app dependencies
ENV PATH /usr/src/app/node/node_modules/.bin:$PATH
COPY package.json /usr/src/app/package.json
RUN npm install --silent
RUN npm install react-scripts@1.1.4 -g --silent

# set environment variables
ARG REACT_APP_USERS_SERVICE_URL
ENV REACT_APP_USERS_SERVICE_URL $REACT_APP_USERS_SERVICE_URL
ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

# create build
COPY . /usr/src/app
RUN npm run build

#########
# FINAL #
#########

# base image
FROM nginx:1.15.0-alpine

# copy static files
COPY --from=BUILDER /usr/src/app/build /usr/share/nginx/html


# expose port
EXPOSE 80

# run nginx
CMD ["nginx", "-g", "daemon off;"]