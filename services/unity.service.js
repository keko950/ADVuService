"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var DbService = require("../mixins/db.mixin");
var jwt = require("jsonwebtoken");
var MoleculerClientError = require("moleculer").Errors.MoleculerClientError;
var ads = require("../ads/ads.config.js");
module.exports = {
    name: "unity",
    mixins: [DbService("users")],
    settings: {},
    dependencies: [],
    actions: {
        check: {
            handler: function (ctx) {
                return ads.version;
            }
        },
        change: {
            handler: function (ctx) {
                ads.version += 1;
                var file = require("../ads/ads.config.js");
                file.version += 1;
                fs.writeFile("../ads/ads.config.js", JSON.stringify(file), function (err) {
                    if (err)
                        return console.log(err);
                });
            }
        },
        serve: {
            handler: function (ctx) {
                ctx.meta.$responseType = 'image/png';
                return fs.createReadStream(ads.advList[Math.floor((Math.random() * ads.advList.length))]);
            }
        },
        getIp: {
            handler: function (ctx) {
                ctx.meta.$responseType = 'text/plain';
                return ctx.meta.remoteAdress;
            }
        }
    },
    events: {},
    methods: {
        resolveToken: function (token) {
            var _this = this;
            return new this.Promise(function (resolve, reject) {
                jwt.verify(token, _this.settings.JWT_SECRET_ADS, function (err, decoded) {
                    if (err)
                        return reject(err);
                    resolve(decoded);
                });
            })
                .then(function (decoded) {
                if (decoded.id)
                    return _this.adapter.findById(decoded.id);
            });
        }
    },
    created: function () {
        this.newAd = true;
    },
    started: function () {
    },
    stopped: function () {
    }
};
