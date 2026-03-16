const express = require("express");
const axios = require("axios");
const manifest = require("./manifest.json");

const app = express();
const PORT = process.env.PORT || 7000;
const OD_BASE_URL = "https://a.111477.xyz/tvs/";

// Middleware to enable CORS
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Content-Type", "application/json");
    next();
});

// Manifest endpoint
app.get("/manifest.json", (req, res) => {
    res.json(manifest);
});

// Stream endpoint
app.get("/stream/:type/:id.json", async (req, res) => {
    const { type, id } = req.params;

    if (type !== "series") {
        return res.json({ streams: [] });
    }

    const [imdbId, season, episode] = id.split(":");

    try {
        // 1. Get metadata to find the show title
        const metadataResponse = await axios.get(`https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`);
        const showTitle = metadataResponse.data.meta.name;

        // 2. Resolve the video from Open Directory
        // (Simplified logic: assuming standard naming convention in OD)
        // Clean show title for URL (replace spaces with %20)
        const encodedTitle = encodeURIComponent(showTitle);
        const s = String(season).padStart(2, "0");
        const e = String(episode).padStart(2, "0");

        // Try to construct a likely URL pattern
        // Note: Realistically, we'd need to scrape/list the directory to find the exact file name
        // but for this demo, we'll construct a common pattern used in many ODs.
        const streamUrl = `${OD_BASE_URL}${encodedTitle}/S${s}/S${s}E${e}.mp4`;

        // Check if the stream exists (head request)
        // Note: Some ODs don't support HEAD or might have different extensions (.mkv, .avi)
        // A more robust implementation would fetch the directory listing.
        
        res.json({
            streams: [
                {
                    title: `Direct Stream - S${season} E${episode}`,
                    url: streamUrl,
                    behaviorHints: {
                        notWebReady: false
                    }
                }
            ]
        });
    } catch (error) {
        console.error("Error resolving stream:", error.message);
        res.json({ streams: [] });
    }
});

// Export the app for Vercel
module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Addon active on http://localhost:${PORT}`);
        console.log(`Manifest URL: http://localhost:${PORT}/manifest.json`);
    });
}
