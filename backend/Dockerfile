# syntax=docker/dockerfile:1.6

# --- build stage ------------------------------------------------------------
FROM golang:1.22-alpine AS build

WORKDIR /src

# Cache module downloads first.
COPY go.mod ./
RUN go mod download

# Copy sources and build a fully-static binary.
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOFLAGS="-trimpath" \
    go build -ldflags="-s -w" -o /out/server .

# --- final stage ------------------------------------------------------------
FROM gcr.io/distroless/static-debian12:nonroot

ENV PORT=8080 \
    ALLOWED_ORIGIN=*

COPY --from=build /out/server /server

EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/server"]
