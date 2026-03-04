package middleware

import (
	"backend/config"
	"backend/pkg/token"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		var tokenStr string

		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenStr = parts[1]
			}
		}

		// Support query param for WebSockets
		if tokenStr == "" {
			tokenStr = strings.TrimSpace(c.Query("token"))
			if tokenStr != "" {
				log.Printf("[Auth] Found token in query param (trimmed): %s...", tokenStr[:10])
			}
		}

		if tokenStr == "" {
			log.Printf("[Auth] No token found in header or query")
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization required"})
			return
		}

		claims, err := token.ValidateToken(tokenStr, cfg.JWTSecret)
		if err != nil {
			log.Printf("[Auth] Token validation failed: %v", err)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		log.Printf("[Auth] Token validated for UserID: %d", claims.UserID)
		c.Set("user_id", claims.UserID)
		c.Set("role", claims.Role)
		c.Next()
	}
}
