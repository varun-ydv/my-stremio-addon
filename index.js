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

    try {
        const metadataResponse = await axios.get(`https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`);
        const showTitle = metadataResponse.data.meta.name;

        // 1. Prepare Folder URL
        // We encode the title but specifically handle spaces as %20
        const encodedTitle = encodeURIComponent(showTitle).replace(/%20/g, "%20");
        const folderUrl = `${OD_BASE_URL}${encodedTitle}/Season%20${season}/`;
        
        // 2. Fetch Directory Listing
        const folderPage = await axios.get(folderUrl, { timeout: 8000 });
        const folderHtml = folderPage.data;

        // 3. Search for Episode (S01E01 format)
        const sPadded = String(season).padStart(2, "0");
        const ePadded = String(episode).padStart(2, "0");
        const target = `S${sPadded}E${ePadded}`;

        // Robust regex to extract href even with encoded symbols like %28 %29
        const linkRegex = new RegExp(`href="([^"]*${target}[^"]*)"`, "i");
        const match = folderHtml.match(linkRegex);

        if (match && match[1]) {
            const rawHref = match[1];
            
            // Resolve the URL properly
            // We use the URL constructor to handle the relative path resolution and encoding
            const fullStreamUrl = new URL(rawHref, folderUrl).toString();

            streams.push({
                name: "OD-STREAM",
                title: `🎬 PLAY: ${showTitle} [${target}]\n🔗 ${rawHref.substring(0, 30)}...`,
                url: fullStreamUrl,
                behaviorHints: {
                    notWebReady: true
                }
            });
        } else {
            streams.push({
                name: "OD-DEBUG",
                title: `⚠️ File not found for ${target} in ${showTitle}`,
                url: "https://error.com"
            });
        }
    } catch (error) {
        console.error("Scraper Error:", error.message);
        streams.push({
            name: "OD-ERROR",
            title: `🚫 Server Error: ${error.message}`,
            url: "https://error.com"
        });
    }

    res.json({ streams });
});

module.exports = app;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Live on ${PORT}`));
}
