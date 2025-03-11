FROM node:22-alpine3.19 AS front-builder

WORKDIR /app

COPY . /app/

RUN \
  cd /app/ui && \
  npm install && \
  npm run build


FROM golang:1.23-alpine AS builder

WORKDIR /app

RUN apk add --no-cache tzdata

COPY ../. /app/

RUN rm -rf /app/ui/dist

COPY --from=front-builder /app/ui/dist /app/ui/dist

RUN go build -o certimate



FROM alpine:latest

WORKDIR /app

RUN apk add --no-cache tzdata

COPY --from=builder /app/certimate .
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

ENTRYPOINT ["./certimate", "serve", "--http", "0.0.0.0:8090"]