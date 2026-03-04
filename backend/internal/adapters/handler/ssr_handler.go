package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type SSRHandler struct {
	nodeURL string
}

func NewSSRHandler() *SSRHandler {
	// Start Node.js server if not running?
	// Ideally, in production, this is a separate service.
	// For this setup, we assume `npm run serve:ssr` is running or we can try to start it.
	// We'll keep it simple: assume it's running on localhost:3000.
	return &SSRHandler{
		nodeURL: "http://localhost:3000/render",
	}
}

// StartNodeServer attempts to start the Node.js sidecar
func (h *SSRHandler) StartNodeServer() {
	// Path is relative to where the Go binary runs (backend/cmd/server/)
	cmd := exec.Command("node", "../../../frontend/server.js")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	go func() {
		if err := cmd.Run(); err != nil {
			fmt.Printf("Node Server Error: %v\n", err)
		}
	}()
	// Give it a moment to start
	time.Sleep(2 * time.Second)
}

func (h *SSRHandler) ServeSSR(c *gin.Context) {
	url := c.Request.URL.String()

	// 1. Prepare payload for Node server
	payload := map[string]string{
		"url": url,
	}
	jsonData, _ := json.Marshal(payload)

	// 2. Call Node server
	resp, err := http.Post(h.nodeURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("SSR Error (Node unreachable): %v\n", err)
		h.serveFallback(c)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		fmt.Printf("SSR Error (Node returned %d)\n", resp.StatusCode)
		h.serveFallback(c)
		return
	}

	// 3. Get HTML snippet from Node
	bodyBytes, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		fmt.Printf("SSR Error (JSON parse): %v\n", err)
		h.serveFallback(c)
		return
	}

	appHtml, _ := result["html"].(string)
	// helmetData, _ := result["helmet"].(map[string]interface{}) // TODO: Extract and inject helmet tags for SEO

	// Read index.html from dist
	// Path is relative to where the Go binary runs (backend/cmd/server/)
	template, err := os.ReadFile("../../../frontend/dist/client/index.html")

	if err != nil {
		// Fallback to local dev path if dist doesn't exist yet?
		// or just error out.
		fmt.Printf("SSR Error (Template not found): %v\n", err)
		c.String(500, "Internal Server Error: Template not found")
		return
	}

	html := string(template)

	// Inject App HTML
	html = strings.Replace(html, "<div id=\"root\"></div>", fmt.Sprintf("<div id=\"root\">%s</div>", appHtml), 1)

	// Inject Helmet (Title, Meta)
	// Helmet data structure usually has .toString() methods in JS, but here we get JSON.
	// We need to parse what react-helmet-async returns in context.helmet.
	// Usually it's an object of { title: { toString: ... }, meta: ... }
	// But JSON serialization might strip functions.
	// The `entry-server.tsx` needs to return the *stringified* helmet parts.
	// Let's assume for now we just inject what we can or rely on client hydration for complex tags if this fails.
	// Ideally, Node should return the strings: { title: "<title>...</title>", meta: "..." }

	// Refinement: update entry-server.tsx to return strings, but for now let's just dump the HTML.
	// If helmet is missing, it's not the end of the world, properly structured app hydration will fix it,
	// BUT SEO needs it.

	// For this Step 1 MVP, we prioritize the App Shell HTML.

	c.Header("Content-Type", "text/html")
	c.String(200, html)
}

func (h *SSRHandler) serveFallback(c *gin.Context) {
	// Serve pure static index.html (CSR)
	c.File("../../../frontend/dist/client/index.html")
}
