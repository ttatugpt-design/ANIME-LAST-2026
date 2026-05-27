package main

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"mime/multipart"
	"net/http"
)

func main() {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.WriteField("content", "Test Post")
	part, _ := writer.CreateFormFile("media[]", "test.jpg")
	part.Write([]byte("fake image"))
	writer.Close()
	req, _ := http.NewRequest("POST", "http://localhost:8080/api/posts", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	res, _ := http.DefaultClient.Do(req)
	b, _ := ioutil.ReadAll(res.Body)
	fmt.Println(res.StatusCode, string(b))
}
