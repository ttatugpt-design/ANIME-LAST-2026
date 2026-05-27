package main

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"mime/multipart"
	"net/http"
	"encoding/json"
)

type Post struct {
	ID uint `json:"id"`
}

func main() {
	// 1. Create Post
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.WriteField("content", "Test Post to Delete")
	part, _ := writer.CreateFormFile("media[]", "test_delete.jpg")
	part.Write([]byte("fake image for delete"))
	writer.Close()

	req, _ := http.NewRequest("POST", "http://localhost:8080/api/posts", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	res, _ := http.DefaultClient.Do(req)
	b, _ := ioutil.ReadAll(res.Body)
	fmt.Println("Create:", res.StatusCode, string(b))

	var p Post
	json.Unmarshal(b, &p)
	if p.ID == 0 {
		return
	}

	// 2. Edit Post
	bodyEdit := &bytes.Buffer{}
	writerEdit := multipart.NewWriter(bodyEdit)
	writerEdit.WriteField("content", "Edited Post")
	writerEdit.WriteField("media_to_keep", "[]") // delete the old image
	partEdit, _ := writerEdit.CreateFormFile("media[]", "test_edited.jpg")
	partEdit.Write([]byte("edited fake image"))
	writerEdit.Close()

	reqEdit, _ := http.NewRequest("PUT", fmt.Sprintf("http://localhost:8080/api/posts/%d", p.ID), bodyEdit)
	reqEdit.Header.Set("Content-Type", writerEdit.FormDataContentType())
	resEdit, _ := http.DefaultClient.Do(reqEdit)
	bEdit, _ := ioutil.ReadAll(resEdit.Body)
	fmt.Println("Edit:", resEdit.StatusCode, string(bEdit))

	// 3. Delete Post
	reqDel, _ := http.NewRequest("DELETE", fmt.Sprintf("http://localhost:8080/api/posts/%d", p.ID), nil)
	resDel, _ := http.DefaultClient.Do(reqDel)
	bDel, _ := ioutil.ReadAll(resDel.Body)
	fmt.Println("Delete:", resDel.StatusCode, string(bDel))
}
