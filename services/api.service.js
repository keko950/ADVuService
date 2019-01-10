"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var MoleculerError = require("moleculer").Errors.MoleculerError;
var _ = require("lodash");
var ApiGateway = require("moleculer-web");
var _a = ApiGateway.Errors, UnAuthorizedError = _a.UnAuthorizedError, ForbiddenError = _a.ForbiddenError;
var fs = require("fs");
var path = require("path");
module.exports = {
    name: "api",
    mixins: [ApiGateway],
    settings: {
        port: process.env.PORT || 3000,
        path: "",
        cors: {
            origin: "*",
            methods: ["GET", "OPTIONS", "POST", "PUT", "DELETE"],
            allowedHeaders: "*",
            credentials: true,
            maxAge: null
        },
        rateLimit: {
            window: 10 * 1000,
            limit: 10,
            headers: true
        },
        routes: [{
                authorization: true,
                path: "/user",
                aliases: {
                    "GET /advToken": "users.getCustomJWT",
                    "GET /me": "users.me",
                    "GET /impressions": "impressions.getImpressions",
                    "POST /login": "users.login",
                    "POST /register": "users.create",
                    "PUT /me": "users.updateMyself"
                },
                mappingPolicy: "restrict",
                bodyParsers: {
                    json: {
                        strict: true
                    },
                    urlencoded: {
                        extended: true
                    }
                },
                onBeforeCall: function (ctx, route, req, res) {
                    this.logger.info("onBeforeCall in /user route");
                },
                onAfterCall: function (ctx, route, req, res, data) {
                    this.logger.info("onAfterCall in /user route");
                    res.setHeader("X-Custom-Header", "Authorized path");
                    return data;
                },
            },
            {
                path: "/unity",
                authorization: "false",
                aliases: {
                    "GET /serve": "unity.serve",
                    "GET /check": "unity.check",
                    "GET /userIp": "unity.getIp",
                    "POST /impression/add": "impressions.create",
                },
                mappingPolicy: "restrict",
                bodyParsers: {
                    json: {
                        strict: true
                    },
                    urlencoded: {
                        extended: true
                    }
                },
                onBeforeCall: function (ctx, route, req, res) {
                    this.logger.info("onBeforeCall in /unity route");
                    ctx.meta.headers = req.headers;
                    ctx.meta.remoteAdress = req.connection.remoteAddress;
                }
            }],
        onError: function (req, res, err) {
            res.setHeader("Content-type", "application/json; charset=utf-8");
            res.writeHead(err.code || 500);
            if (err.code == 422) {
                var o_1 = {};
                err.data.forEach(function (e) {
                    var field = e.field.split(".").pop();
                    o_1[field] = e.message;
                });
                res.end(JSON.stringify({ errors: o_1 }, null, 2));
            }
            else {
                var errObj = _.pick(err, ["name", "message", "code", "type", "data"]);
                res.end(JSON.stringify(errObj, null, 2));
            }
            this.logResponse(req, res, err ? err.ctx : null);
        }
    },
    methods: {
        authorize: function (ctx, route, req) {
            var _this = this;
            var token;
            if (req.headers.authorization) {
                var type = req.headers.authorization.split(" ")[0];
                if (type === "Token" || type === "Bearer")
                    token = req.headers.authorization.split(" ")[1];
            }
            return this.Promise.resolve(token)
                .then(function (token) {
                if (token) {
                    return ctx.call("users.resolveToken", { token: token })
                        .then(function (user) {
                        if (user) {
                            _this.logger.info("Authenticated via JWT: ", user.username);
                            ctx.meta.user = _.pick(user, ["_id", "username", "email", "name"]);
                            ctx.meta.token = token;
                            ctx.meta.userID = user._id;
                        }
                        return Promise.resolve(ctx);
                    })
                        .catch(function (err) {
                        return null;
                    });
                }
            })
                .then(function (user) {
                if (req.$action.auth == "required" && !user)
                    return _this.Promise.reject(new UnAuthorizedError());
            });
        }
    }
};
