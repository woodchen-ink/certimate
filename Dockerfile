FROM node:22-alpine3.19 AS webui-builder
WORKDIR /app
COPY . /app/
RUN \
  cd /app/ui && \
  npm install && \
  npm run build



FROM golang:1.24-alpine AS builder
WORKDIR /app

RUN apk add --no-cache tzdata
COPY ../. /app/
RUN rm -rf /app/ui/dist
COPY --from=webui-builder /app/ui/dist /app/ui/dist
ENV CGO_ENABLED=0
RUN go build -ldflags="-s -w" -o certimate



FROM alpine:latest
WORKDIR /app

RUN apk add --no-cache tzdata
COPY --from=builder /app/certimate .
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
ENTRYPOINT ["./certimate", "serve", "--http", "0.0.0.0:8090"]
