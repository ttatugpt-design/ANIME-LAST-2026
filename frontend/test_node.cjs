const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('content', 'Test from Node');
form.append('media[]', Buffer.from('fake image'), 'test.jpg');

axios.post('http://localhost:8080/api/posts', form, {
    headers: form.getHeaders()
}).then(res => {
    console.log("Create Status:", res.status);
    console.log("Create Data:", res.data);
}).catch(err => {
    console.error("Create Error:", err.response ? err.response.data : err.message);
});
