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

    try {
        const metadataResponse = await axios.get(`https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`);
        const showTitle = metadataResponse.data.meta.name;

        const encodedTitle = encodeURIComponent(showTitle);
        const seasonFolder = `Season%20${season}`;
        const targetEpisode = `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;

        const folderUrl = `${OD_BASE_URL}${encodedTitle}/${seasonFolder}/`;
        
        // SMART SCRAPER: Fetch the directory listing to find the exact file
        const folderPage = await axios.get(folderUrl);
        const folderHtml = folderPage.data;

        // Find the link that contains our SxxExx episode ID
        // This regex looks for an <a> tag where the href or text contains our S01E01 pattern
        const linkRegex = new RegExp(`href="([^"]*${targetEpisode}[^"]*)"`, "i");
        const match = folderHtml.match(linkRegex);

        if (match && match[1]) {
            const fileName = match[1];
            const fullStreamUrl = fileName.startsWith("http") ? fileName : `${folderUrl}${fileName}`;

            return res.json({
                streams: [
                    {
                        title: `Smart Direct Stream - S${season} E${episode}`,
                        url: fullStreamUrl
                    }
                ]
            });
        }

        res.json({ streams: [] });
    } catch (error) {
        console.error("Scraper Error:", error.message);
        res.json({ streams: [] });
    }
});

module.exports = app;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Live on ${PORT}`));
}
