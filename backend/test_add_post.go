package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"mime/multipart"
	"net/http"
)

type AuthResponse struct {
	AccessToken string `json:"access_token"`
}

func main() {
	// 1. Login
	loginBody := bytes.NewBuffer([]byte(`{"email":"abdo1@gmail.com","password":"password123"}`))
	res, _ := http.Post("http://localhost:8080/api/auth/login", "application/json", loginBody)
	b, _ := ioutil.ReadAll(res.Body)
	var auth AuthResponse
	json.Unmarshal(b, &auth)
	if auth.AccessToken == "" {
		// try test user
		loginBody = bytes.NewBuffer([]byte(`{"email":"test@example.com","password":"password"}`))
		res, _ = http.Post("http://localhost:8080/api/auth/login", "application/json", loginBody)
		b, _ = ioutil.ReadAll(res.Body)
		json.Unmarshal(b, &auth)
	}
	
	fmt.Println("Token:", auth.AccessToken != "")

	// 2. Post
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.WriteField("content", "Test Post")
	part, _ := writer.CreateFormFile("media[]", "test.jpg")
	part.Write([]byte("fake image"))
	writer.Close()

	req, _ := http.NewRequest("POST", "http://localhost:8080/api/posts", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer " + auth.AccessToken)
	res, _ = http.DefaultClient.Do(req)
	b, _ = ioutil.ReadAll(res.Body)
	fmt.Println(res.StatusCode, string(b))
}
