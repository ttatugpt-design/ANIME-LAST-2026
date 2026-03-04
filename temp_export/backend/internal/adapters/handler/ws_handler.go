package handler

import (
	"backend/internal/adapters/ws"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Rely on other auth for strictness
	},
}

type WSHandler struct {
	Hub *ws.Hub
}

func NewWSHandler(hub *ws.Hub) *WSHandler {
	return &WSHandler{Hub: hub}
}

func (h *WSHandler) HandleWS(c *gin.Context) {
	// Authenticated users only
	userID := c.GetUint("user_id")
	log.Printf("[WSHandler] Incoming request from UserID: %d", userID)

	if userID == 0 {
		log.Printf("[WSHandler] Unauthorized: userID is 0")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[WSHandler] WebSocket Upgrade error: %v", err)
		return
	}
	log.Printf("[WSHandler] Upgrade successful for UserID: %d", userID)

	client := &ws.Client{
		Hub:    h.Hub,
		Conn:   conn,
		Send:   make(chan []byte, 256),
		UserID: userID,
	}

	client.Hub.RegisterClient(client)

	// Start pumps
	go client.WritePump()
	go client.ReadPump()
}
