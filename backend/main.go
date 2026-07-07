// Command server runs the fullstack-calculator HTTP API.
//
// It wires routes and middleware around the pure calculator and handler
// packages. Excluded from the coverage target (assignment allowance for
// entrypoints) so it stays small and free of testable business logic.
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/fullstack-calculator/backend/handler"
)

func main() {
	port := getenv("PORT", "8080")
	allowedOrigin := getenv("ALLOWED_ORIGIN", "*")

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/calculate", handler.Calculate)
	mux.HandleFunc("GET /healthz", handler.Healthz)

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: corsMiddleware(allowedOrigin, mux),
	}

	log.Printf("calculator backend listening on :%s (CORS origin %q)", port, allowedOrigin)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// corsMiddleware permits a single configurable origin (or "*") and answers
// preflight OPTIONS locally. Deliberately narrow: the deployed setup routes
// browser traffic through the Nginx proxy on the same origin, so CORS is
// only relevant during local development.
func corsMiddleware(allowedOrigin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
