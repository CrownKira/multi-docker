FROM node:alpine as builder
WORKDIR '/app'
COPY ./package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx

# TODO: why need expose? if there is a proxy?
# why map 3000 to external 8080
# docker build .  (get image id)
# docker run -p 8080:3000 <image_id>   
EXPOSE 3000
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html