module.exports = {
    apps: [
        {
            name: "theater-scraper-2-backend",
            cwd: __dirname,
            script: "./backend/dist/server.js",
            env: {
                NODE_ENV: "production",
            },
        },
        {
            name: "theater-scraper-update-script",
            cwd: __dirname,
            script: "./backend/dist/scrape.js"
        },
    ],
};