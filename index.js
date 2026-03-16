const express = require("express");
const axios = require("axios");
const manifest = require("./manifest.json");

const app = express();
const PORT = process.env.PORT || 7000;
const OD_BASE_URL = "https://a.111477.xyz/tvs/";

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Content-Type", "application/json");
    next();
});

app.get("/manifest.json", (req, res) => res.json(manifest));

app.get("/stream/:type/:id.json", async (req, res) => {
    const { type, id } = req.params;
    if (type !== "series") return res.json({ streams: [] });

    const [imdbId, season, episode] = id.split(":");
    const streams = [];

    const getFolderContent = async (title) => {
        const variations = [title, title.replace(/ /g, ".")];
        
        for (const v of variations) {
            const folderUrl = `${OD_BASE_URL}${encodeURIComponent(v)}/Season%20${season}/`;
            try {
                const response = await axios.get(folderUrl, { 
                    timeout: 8000,
                    headers: { 
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36',
                        'Referer': 'https://a.111477.xyz/',
                        'Origin': 'https://a.111477.xyz'
                    }
                });
                return { html: response.data, url: folderUrl };
            } catch (e) {
                if (e.response && e.response.status === 403) throw new Error("ACCESS_DENIED");
                continue;
            }
        }
        return null;
    };

    try {
        const metadataResponse = await axios.get(`https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`);
        const showTitle = metadataResponse.data.meta.name;

        const folderData = await getFolderContent(showTitle);

        if (folderData) {
            const sPadded = String(season).padStart(2, "0");
            const ePadded = String(episode).padStart(2, "0");
            const target = `S${sPadded}E${ePadded}`;

            const linkRegex = new RegExp(`href="([^"]*${target}[^"]*)"`, "i");
            const match = folderData.html.match(linkRegex);

            if (match && match[1]) {
                const finalUrl = new URL(match[1], folderData.url).href;
                streams.push({
                    name: "OD-STREAM",
                    title: `🚀 PLAY: ${showTitle} S${season}E${episode}`,
                    url: finalUrl,
                    behaviorHints: { notWebReady: true }
                });
            } else {
                streams.push({ title: `🔍 No file for ${target} in ${showTitle}`, url: "https://error.com" });
            }
        } else {
            streams.push({ title: `❌ Show folder not found`, url: "https://error.com" });
        }
    } catch (error) {
        if (error.message === "ACCESS_DENIED") {
            streams.push({
                name: "OD-BLOCKED",
                title: `💩 Error 403: Site is blocking Vercel server.`,
                url: "https://error.com"
            });
        } else {
            streams.push({ title: `🚫 Error: ${error.message}`, url: "https://error.com" });
        }
    }

    res.json({ streams });
});

module.exports = app;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Smart Scraper Active`));
}
