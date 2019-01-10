"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DbService = require("../mixins/db.mixin");
var jwt = require("jsonwebtoken");
var _a = require("moleculer").Errors, MoleculerClientError = _a.MoleculerClientError, ValidationError = _a.ValidationError, MoleculerError = _a.MoleculerError, ServiceNotAvailableError = _a.ServiceNotAvailableError;
var _ = require("lodash");
var v = require("../validators/validator");
var ads = require("../ads/ads.config.js");
var http = require('http');
module.exports = {
    name: "impressions",
    mixins: [DbService("impressions")],
    settings: {
        JWT_SECRET: process.env.JWT_SECRET || "jwt-advu-top-secret",
        JWT_SECRET_ADS: process.env.JWT_SECRET_ADS || "jwt-advu-top-secret-forads",
        apikey: "daec5229f833fcbf435649c934058df0"
    },
    dependencies: [],
    actions: {
        create: {
            params: {
                ip: { type: "string" },
                date: { type: "string" },
                apikey: { type: "string" },
            },
            handler: function (ctx) {
                var _this = this;
                var impression = {
                    ip: ctx.params.ip,
                    date: new Date(ctx.params.date),
                    userId: "",
                    localization: "",
                    earn: ""
                };
                var entity = impression;
                if (ctx.meta.headers.comefromunity) {
                    return this.resolveAdsToken(ctx.params.apikey)
                        .then(function (id) {
                        entity.userId = id;
                        var ret = _this.validateEntity(entity);
                        if (ret == true) {
                            http.get("http://api.ipstack.com/" + entity.ip + "?access_key=" + _this.settings.apikey + "&format=1", function (res) {
                                res.on('data', function (d) {
                                    var obj = JSON.parse(d);
                                    entity.localization = obj.country_code;
                                    if (entity.localization != null) {
                                        entity.earn = _this.getRevenue(entity.localization);
                                        _this.adapter.insert(entity);
                                    }
                                });
                                res.on('error', function (err) {
                                    return Promise.reject(new ServiceNotAvailableError("Localization service not working", 404, "", [{ field: "localization", message: "invalid" }]));
                                });
                            });
                        }
                        else {
                            return _this.Promise.reject(new ValidationError("Validation Error", 422, [{ field: "ComeFromUnity", message: "invalid" }]));
                        }
                    });
                }
                else {
                    return this.Promise.reject(new ValidationError("Validation Error", 422, [{ field: "ComeFromUnity", message: "invalid" }]));
                }
            }
        },
        getImpressions: {
            auth: "required",
            params: {
                ip: { type: "string", optional: true },
                loc: { type: "string", optional: true },
                date1: { type: "string", optional: true },
                date2: { type: "string", optional: true }
            },
            handler: function (ctx) {
                var _this = this;
                return this.resolveToken(ctx.meta.token)
                    .then(function (id) {
                    var query = { query: { userId: id.id } };
                    if (ctx.params.ip)
                        query.query["ip"] = ctx.params.ip;
                    if (ctx.params.loc)
                        query.query["localization"] = ctx.params.loc;
                    if (ctx.params.date1 && ctx.params.date2)
                        query.query["date"] = {
                            "$gte": new Date(ctx.params.date1),
                            "$lt": new Date(ctx.params.date2)
                        };
                    return _this.adapter.find(query)
                        .then(function (found) {
                        if (found) {
                            return found;
                        }
                        else
                            return Promise.reject(new MoleculerClientError("Something went wrong", 422, "", [{ field: "userId", message: "impressions not found" }]));
                    });
                });
            },
        },
    },
    events: {},
    methods: {
        resolveToken: function (token) {
            var _this = this;
            return new this.Promise(function (resolve, reject) {
                jwt.verify(token, _this.settings.JWT_SECRET, function (err, decoded) {
                    if (err)
                        return reject(err);
                    resolve(decoded);
                });
            });
        },
        resolveAdsToken: function (token) {
            var _this = this;
            return new this.Promise(function (resolve, reject) {
                jwt.verify(token, _this.settings.JWT_SECRET_ADS, function (err, decoded) {
                    if (err)
                        return reject(new ValidationError("Validation Error", 422, [{ field: "Token", message: "invalid" }]));
                    resolve(decoded);
                });
            })
                .then(function (decoded) {
                return decoded.id;
            });
        },
        validateEntity: function (entity) {
            var ret = this.check(entity);
            if (ret == true)
                return true;
            else
                return ret;
        },
        getRevenue: function (localization) {
            var res = ads.revenue.find(function (item) {
                return item.localization == localization;
            });
            if (res)
                return res.earn;
            else
                return 0.0;
        }
    },
    created: function () {
        this.entityValidator = {
            ip: { type: "string", min: 7, pattern: /^[0-9\\.]+$/ },
        };
        this.check = v.compile(this.entityValidator);
    },
    started: function () {
    },
    stopped: function () {
    }
};
