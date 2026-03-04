import fs from 'fs';
import path from 'path';
import express from 'express';
import { fileURLToPath, pathToFileURL } from 'url';

// Constants
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// This file will be run from frontend/ so dist/server/entry-server.js is the path
const SERVER_ENTRY = path.resolve(__dirname, 'dist/server/entry-server.js');
const TEMPLATE_PATH = path.resolve(__dirname, 'dist/client/index.html');

const app = express();
app.use(express.json());

// Import the server bundle (built by vite)
let render;

// Dynamic import because the build output is ESM
async function loadServerBundle() {
    try {
        // Convert Windows path to file:// URL for ESM import
        const serverEntryURL = pathToFileURL(SERVER_ENTRY).href;
        const serverEntry = await import(serverEntryURL);
        render = serverEntry.render;
        console.log("✅ SSR Bundle loaded successfully");
    } catch (e) {
        console.error("❌ Failed to load SSR bundle:", e);
    }
}

app.post('/render', async (req, res) => {
    const { url } = req.body;

    if (!render) {
        return res.status(500).send("SSR Renderer not ready");
    }

    try {
        const appHtml = await render(url);
        // Note: entry-server.tsx returns { html, helmet }
        res.json(appHtml);
    } catch (e) {
        console.error("SSR Rendering Error:", e);
        // Fallback to client-side rendering if server fails? 
        // Or return 500. Let's return error so Go can fallback.
        res.status(500).json({ error: e.message });
    }
});

const PORT = 3000;
app.listen(PORT, async () => {
    await loadServerBundle();
    console.log(`🚀 Node SSR Sidecar running on http://localhost:${PORT}`);
});
