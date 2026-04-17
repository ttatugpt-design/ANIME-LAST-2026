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
					strings.HasPrefix(path, "/flag-icons")

		if isStatic {
			c.Header("Cache-Control", cacheControlValue)
			c.Header("Expires", time.Now().Add(time.Duration(maxAge)*time.Second).Format(time.RFC1123))
			// Ensure Pragma is removed to allow caching in older browsers
			c.Header("Pragma", "")
		}

		c.Next()
	}
}
