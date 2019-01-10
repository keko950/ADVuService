'use strict';
let path = require("path");
module.exports = {
    version: 1,
    advList: [
        path.join(__dirname, "../public/ads/banner.png"),
        path.join(__dirname, "../public/ads/puma.jpg"),
        path.join(__dirname, "../public/ads/adidas.jpg"),
        //"../public/ads/banner2.png"
    ],
    revenue: [
        {localization: "ES", earn: 0.05},
        {localization: "FR", earn: 0.03},
        {localization: "CA", earn: 0.02}
    ]
}