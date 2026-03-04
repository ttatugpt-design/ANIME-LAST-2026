package ws

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

// Client represents a single connection
type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	Send   chan []byte
	UserID uint
	Topics []string // List of topics this client is subscribed to
}

// Hub maintains the set of active clients and broadcasts messages to them
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from the clients.
	broadcast chan []byte

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	// topic -> set of clients
	topics map[string]map[*Client]bool

	// userID -> count of active connections
	onlineUsers map[uint]int

	mu sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		broadcast:   make(chan []byte),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		clients:     make(map[*Client]bool),
		topics:      make(map[string]map[*Client]bool),
		onlineUsers: make(map[uint]int),
	}
}

func (h *Hub) RegisterClient(client *Client) {
	h.register <- client
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.onlineUsers[client.UserID]++

			// Send current online users list to the new client
			onlineIds := make([]uint, 0, len(h.onlineUsers))
			for id := range h.onlineUsers {
				onlineIds = append(onlineIds, id)
			}
			msg := map[string]interface{}{
				"type": "online_list",
				"data": onlineIds,
			}
			payload, _ := json.Marshal(msg)
			client.Send <- payload

			// If this is the first connection, broadcast online status
			if h.onlineUsers[client.UserID] == 1 {
				h.broadcastPresence(client.UserID, "online")
			}
			h.mu.Unlock()
			log.Printf("[WSHub] Client registered (UserID: %d)", client.UserID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				h.onlineUsers[client.UserID]--

				// If this was the last connection, broadcast offline status
				if h.onlineUsers[client.UserID] <= 0 {
					delete(h.onlineUsers, client.UserID)
					h.broadcastPresence(client.UserID, "offline")
				}

				// Remove from topics
				for _, topic := range client.Topics {
					h.unsubscribe(client, topic)
				}

				close(client.Send)
				log.Printf("[WSHub] Client unregistered (UserID: %d)", client.UserID)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					// If send channel is full, remove client
					close(client.Send)
					delete(h.clients, client)
					// Also remove from topics
					for _, topic := range client.Topics {
						h.unsubscribe(client, topic)
					}
					log.Printf("[WSHub] Client send buffer full, unregistered (UserID: %d)", client.UserID)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Subscribe adds a client to a topic
func (h *Hub) Subscribe(client *Client, topic string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.topics[topic]; !ok {
		h.topics[topic] = make(map[*Client]bool)
	}
	h.topics[topic][client] = true

	// Add topic to client's list if not already present
	found := false
	for _, t := range client.Topics {
		if t == topic {
			found = true
			break
		}
	}
	if !found {
		client.Topics = append(client.Topics, topic)
	}
	log.Printf("[WSHub] Client %d subscribed to topic '%s'", client.UserID, topic)
}

// Unsubscribe removes a client from a topic
func (h *Hub) Unsubscribe(client *Client, topic string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.unsubscribe(client, topic)
}

// unsubscribe is the internal, non-locking version of Unsubscribe
func (h *Hub) unsubscribe(client *Client, topic string) {
	if clientsInTopic, ok := h.topics[topic]; ok {
		if _, ok := clientsInTopic[client]; ok {
			delete(clientsInTopic, client)
			if len(clientsInTopic) == 0 {
				delete(h.topics, topic)
			}

			// Remove topic from client's list
			for i, t := range client.Topics {
				if t == topic {
					client.Topics = append(client.Topics[:i], client.Topics[i+1:]...)
					break
				}
			}
			log.Printf("[WSHub] Client %d unsubscribed from topic '%s'", client.UserID, topic)
		}
	}
}

// BroadcastToTopic sends a message to all clients subscribed to a specific topic
func (h *Hub) BroadcastToTopic(topic string, message interface{}) {
	payload, err := json.Marshal(message)
	if err != nil {
		log.Printf("[WSHub] Error marshalling message for topic '%s': %v", topic, err)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	if clientsInTopic, ok := h.topics[topic]; ok {
		for client := range clientsInTopic {
			select {
			case client.Send <- payload:
			default:
				// If send channel is full, consider client unresponsive and remove from topic
				// Note: This client might still be in h.clients, but will be cleaned up by unregister if it closes.
				// For now, just skip sending to this client.
				log.Printf("[WSHub] Client %d send buffer full for topic '%s', skipping message", client.UserID, topic)
			}
		}
	} else {
		log.Printf("[WSHub] No clients subscribed to topic '%s'", topic)
	}
}

// BroadcastToUser sends a message to a specific user
func (h *Hub) BroadcastToUser(userID uint, topic string, message interface{}) {
	payload, err := json.Marshal(message)
	if err != nil {
		log.Printf("[WSHub] Error marshalling message for user %d: %v", userID, err)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	sent := false
	for client := range h.clients {
		if client.UserID == userID {
			select {
			case client.Send <- payload:
				sent = true
			default:
				log.Printf("[WSHub] Client %d send buffer full, skipping message", client.UserID)
			}
		}
	}

	if !sent {
		// Log but don't error, user might just be offline which is fine
		// log.Printf("[WSHub] User %d is not connected", userID)
	}
}

// SendToUser sends a message to all active connections of a user
func (h *Hub) SendToUser(userID uint, message interface{}) {
	payload, err := json.Marshal(message)
	if err != nil {
		log.Printf("[WSHub] Error marshalling message: %v", err)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		if client.UserID == userID {
			select {
			case client.Send <- payload:
			default:
				log.Printf("[WSHub] Client %d send buffer full for user message, skipping", client.UserID)
			}
		}
	}
}

// IsUserOnline checks if a user has any active WebSocket connections
func (h *Hub) IsUserOnline(userID uint) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.onlineUsers[userID] > 0
}

// broadcastPresence notifies all users about a presence change
func (h *Hub) broadcastPresence(userID uint, status string) {
	msg := map[string]interface{}{
		"type": "user_presence",
		"data": map[string]interface{}{
			"user_id": userID,
			"status":  status,
		},
	}
	payload, _ := json.Marshal(msg)

	// Since presence is global, we can use the regular h.broadcast mechanism
	// or iterate through clients. Let's use broadcast to all connected users.
	for client := range h.clients {
		select {
		case client.Send <- payload:
		default:
			// Just skip if buffer is full
		}
	}
}

// WritePump pumps messages from the hub to the websocket connection
func (c *Client) WritePump() {
	defer func() {
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.Send:
			if !ok {
				// The hub closed the channel.
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message.
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}
		}
	}
}

// ReadPump handles messages FROM the client (if any), currently just for heartbeat/cleanup
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	type WSMessage struct {
		Type       string `json:"type"`
		Topic      string `json:"topic"`
		ReceiverID uint   `json:"receiver_id"`
		IsTyping   bool   `json:"is_typing"`
		SenderID   uint   `json:"sender_id"`
	}

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WSHub] Error: %v", err)
			}
			break
		}

		var msg WSMessage
		if err := json.Unmarshal(message, &msg); err == nil {
			switch msg.Type {
			case "subscribe":
				if msg.Topic != "" {
					c.Hub.Subscribe(c, msg.Topic)
				}
			case "unsubscribe":
				if msg.Topic != "" {
					c.Hub.Unsubscribe(c, msg.Topic)
				}
			case "typing":
				if msg.ReceiverID != 0 {
					// Forward typing status to the specific receiver
					typingMsg := map[string]interface{}{
						"type": "typing",
						"data": map[string]interface{}{
							"sender_id": c.UserID,
							"is_typing": msg.IsTyping,
						},
					}
					c.Hub.BroadcastToUser(msg.ReceiverID, "typing", typingMsg)
				}
			case "read_receipt":
				if msg.SenderID != 0 {
					// Forward read receipt to the original sender
					readMsg := map[string]interface{}{
						"type": "read_receipt",
						"data": map[string]interface{}{
							"receiver_id": c.UserID, // The one who read it
							"sender_id":   msg.SenderID,
						},
					}
					c.Hub.BroadcastToUser(msg.SenderID, "read_receipt", readMsg)
				}
			}
		}
	}
}
