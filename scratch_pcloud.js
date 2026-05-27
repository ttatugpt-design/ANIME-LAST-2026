const https = require('https');

function pcloudAuth() {
    const url = "https://api.pcloud.com/userinfo?getauth=1&logout=1&username=abdogames9967@gmail.com&password=847641088";
    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log("Auth Response:", data);
            const json = JSON.parse(data);
            if (json.auth) {
                listFolder(json.auth);
            }
        });
    });
}

function listFolder(auth) {
    const url = `https://api.pcloud.com/listfolder?folderid=31150475342&auth=${auth}`;
    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const json = JSON.parse(data);
            console.log("Folder Content:");
            if (json.metadata && json.metadata.contents) {
                json.metadata.contents.forEach(item => {
                    console.log(`- ${item.name} (${item.isfolder ? 'Folder' : 'File'})`);
                });
            } else {
                console.log(json);
            }
        });
    });
}

pcloudAuth();
