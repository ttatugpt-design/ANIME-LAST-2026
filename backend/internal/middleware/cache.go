package middleware

import (
	"fmt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// StaticCacheMiddleware sets long-term caching headers for static assets like images and emojis.
// maxAge is in seconds. Default is 1 year (31536000 seconds).
func StaticCacheMiddleware(maxAge int) gin.HandlerFunc {
	if maxAge <= 0 {
		maxAge = 31536000 // 1 Year
	}

	cacheControlValue := fmt.Sprintf("public, max-age=%d, immutable", maxAge)

	return func(c *gin.Context) {
		path := c.Request.URL.Path
		
		// Only apply to static file directories and typical image extensions
		isStatic := strings.HasPrefix(path, "/uploads") || 
					strings.HasPrefix(path, "/custom-emojis") || 
					strings.HasPrefix(path, "/assets") ||
					strings.HasPrefix(path, "/flag-icons") ||
					strings.HasSuffix(path, ".ico") ||
					strings.HasSuffix(path, ".png") ||
					strings.HasSuffix(path, ".jpg") ||
					strings.HasSuffix(path, ".jpeg") ||
					strings.HasSuffix(path, ".webp") ||
					strings.HasSuffix(path, ".svg")

		if isStatic {
			c.Header("Cache-Control", cacheControlValue)
			c.Header("Expires", time.Now().Add(time.Duration(maxAge)*time.Second).Format(time.RFC1123))
			// Ensure Pragma is removed to allow caching in older browsers
			c.Header("Pragma", "")
			
			// If it's a static file request, Gin handles ETag automatically, 
			// but for some proxied responses we might want to ensure it.
		}

		c.Next()
	}
}

// SecurityHeadersMiddleware adds headers that improve both security and browser performance/behavior.
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Performance & Reliability
		c.Header("Connection", "keep-alive")
		c.Header("Keep-Alive", "timeout=5, max=1000")
		
		// Security (Helps browser focus on rendering)
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		
		c.Next()
	}
}
