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

    // DEBUG FALLBACK: Always send a link so the user knows the addon is alive
    streams.push({
        title: "📡 Addon is Online - Waiting for Scrape...",
        url: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4"
    });

    try {
        const metadataResponse = await axios.get(`https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`);
        const showTitle = metadataResponse.data.meta.name;

        // The OD uses specific names, e.g., "3 Body Problem"
        const encodedTitle = encodeURIComponent(showTitle);
        const folderUrl = `${OD_BASE_URL}${encodedTitle}/Season%20${season}/`;
        
        const folderPage = await axios.get(folderUrl, { timeout: 5000 });
        const folderHtml = folderPage.data;

        // Search for SxxExx (e.g., S01E01)
        const sPadded = String(season).padStart(2, "0");
        const ePadded = String(episode).padStart(2, "0");
        const target = `S${sPadded}E${ePadded}`;

        // Find file link in HTML
        const linkRegex = new RegExp(`href="([^"]*${target}[^"]*)"`, "i");
        const match = folderHtml.match(linkRegex);

        if (match && match[1]) {
            let fileName = match[1];
            // Decode and re-encode to ensure it's a valid URL
            const fullStreamUrl = new URL(fileName, folderUrl).href;

            streams.unshift({
                title: `✅ play: ${showTitle} S${season}E${episode}`,
                url: fullStreamUrl,
                behaviorHints: {
                    notWebReady: true // Hint that it might be .mkv
                }
            });
        }
    } catch (error) {
        streams.push({
            title: `❌ Error: ${error.message.substring(0, 30)}`,
            url: "https://error.com"
        });
    }

    res.json({ streams });
});

module.exports = app;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Live on ${PORT}`));
}
