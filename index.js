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

        // MATCHING THE SPECIFIC OD FORMAT:
        // Folder Name: "3 Body Problem" 
        // Subfolder: "Season 1"
        // Note: Filenames in ODs vary wildly, so we link to the likely folder path 
        // or a common filename pattern like s01e01.mp4
        
        const encodedTitle = encodeURIComponent(showTitle);
        const sPadded = String(season).padStart(2, "0");
        const ePadded = String(episode).padStart(2, "0");

        // Patterns common in this specific OD
        const streamUrl = `${OD_BASE_URL}${encodedTitle}/Season%20${season}/${encodedTitle}.S${sPadded}E${ePadded}.1080p.mp4`;

        res.json({
            streams: [
                {
                    title: `OD Direct Stream - S${season} E${episode}`,
                    url: streamUrl
                }
            ]
        });
    } catch (error) {
        res.json({ streams: [] });
    }
});

module.exports = app;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Live on ${PORT}`));
}
