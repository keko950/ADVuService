"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DbService = require("../mixins/db.mixin");
var bcrypt = require("bcrypt");
var _ = require("lodash");
var jwt = require("jsonwebtoken");
var MoleculerClientError = require("moleculer").Errors.MoleculerClientError;
var AuthClientError = require("../errors").AuthClientError;
var v = require("../validators/validator");
var salt = bcrypt.genSaltSync(10);
module.exports = {
    name: "users",
    mixins: [DbService("users")],
    settings: {
        JWT_SECRET: process.env.JWT_SECRET || "jwt-advu-top-secret",
        JWT_SECRET_ADS: process.env.JWT_SECRET_ADS || "jwt-advu-top-secret-forads",
        fields: ["_id", "username", "name", "surname", "email", "advToken"]
    },
    dependencies: [],
    actions: {
        getCustomJWT: {
            auth: "required",
            handler: function (ctx) {
                var _this = this;
                if (ctx.meta.user) {
                    var name_1 = ctx.meta.user.username;
                    return this.adapter.findOne({ username: name_1 })
                        .then(function (found) {
                        if (found)
                            return _this.generateCustomJWT(found);
                        else
                            return Promise.reject(new MoleculerClientError("Something went wrong", 422, "", [{ field: "Username", message: "not found" }]));
                    });
                }
                else {
                    return Promise.reject(new AuthClientError("Something went wrong", 403, "", [{ field: "User", message: "not found" }]));
                }
            }
        },
        create: {
            params: {
                user: { type: "object" }
            },
            handler: function (ctx) {
                var _this = this;
                var entity = ctx.params.user;
                return this.validateEntity(entity)
                    .then(function () {
                    if (entity.username)
                        return _this.adapter.findOne({ username: entity.username })
                            .then(function (found) {
                            if (found)
                                return Promise.reject(new AuthClientError("Username already exists!", 422, "", [{ field: "Username", message: "already exists" }]));
                        });
                })
                    .then(function () {
                    if (entity.email)
                        return _this.adapter.findOne({ email: entity.email })
                            .then(function (found) {
                            if (found)
                                return Promise.reject(new AuthClientError("Email already exists!", 422, "", [{ field: "Email", message: "already exists" }]));
                        });
                })
                    .then(function () {
                    entity.password = bcrypt.hashSync(entity.password, salt);
                    ;
                    return _this.adapter.insert(entity)
                        .then(function (user) { return _this.transformEntity(user, false, ctx.meta.token); });
                });
            }
        },
        login: {
            params: {
                user: { type: "object", prop: {
                        username: { type: "string" },
                        password: { type: "string", min: 1 }
                    } }
            },
            handler: function (ctx) {
                var _this = this;
                var entity = ctx.params.user;
                if (entity.username)
                    return this.adapter.findOne({ username: entity.username })
                        .then(function (found) {
                        if (!found)
                            return Promise.reject(new AuthClientError("Username not found", "", [{ field: "Username", message: "not found" }]));
                        return bcrypt.compare(entity.password, found.password).then(function (res) {
                            if (!res)
                                return Promise.reject(new AuthClientError("Wrong password", "", [{ field: "Password", message: "not match" }]));
                            else {
                                ctx.meta.token = _this.generateJWT(found);
                                return _this.transformEntity(found, true, ctx.meta.token);
                            }
                        });
                    });
            }
        },
        me: {
            auth: "required",
            handler: function (ctx) {
                var _this = this;
                if (ctx.meta.user) {
                    var name_2 = ctx.meta.user.username;
                    return this.adapter.findOne({ username: name_2 })
                        .then(function (found) {
                        if (found)
                            return _this.transformEntity(found, true, ctx.meta.token);
                        else
                            return Promise.reject(new AuthClientError("Something went wrong", 403, "", [{ field: "Username", message: "not found" }]));
                    });
                }
                else {
                    return Promise.reject(new AuthClientError("Something went wrong", 403, "", [{ field: "Username", message: "not found" }]));
                }
            }
        },
        resolveToken: {
            params: {
                token: { type: "string" }
            },
            handler: function (ctx) {
                var _this = this;
                return new this.Promise(function (resolve, reject) {
                    jwt.verify(ctx.params.token, _this.settings.JWT_SECRET, function (err, decoded) {
                        if (err)
                            return reject(err);
                        resolve(decoded);
                    });
                })
                    .then(function (decoded) {
                    if (decoded.id)
                        return _this.getById(decoded.id);
                });
            }
        },
        updateMyself: {
            params: {
                user: { type: "object", props: {
                        password: { type: "string", optional: true, min: 8 },
                        email: { type: "email", optional: true },
                        surname: { type: "string", min: 3, optional: true, pattern: /^[a-zA-Z0-9]+$/ },
                        name: { type: "string", min: 3, optional: true, pattern: /^[a-zA-Z0-9]+$/ }
                    } }
            },
            auth: "required",
            handler: function (ctx) {
                var _this = this;
                if (ctx.meta.user) {
                    return this.adapter.findById(ctx.meta.user._id)
                        .then(function (found) {
                        var newData = ctx.params.user;
                        if (newData.password)
                            found.password = bcrypt.hashSync(newData.password, salt);
                        if (newData.email)
                            found.email = newData.email;
                        if (newData.surname)
                            found.surname = newData.surname;
                        if (newData.name)
                            found.name = newData.name;
                        found.updatedAt = new Date();
                        var update = {
                            $set: found
                        };
                        return _this.adapter.updateById(ctx.meta.user._id, update);
                    });
                }
                else {
                    return Promise.reject(new AuthClientError("Something went wrong", "", [{ field: "Username", message: "not found" }]));
                }
            }
        }
    },
    events: {},
    methods: {
        validateEntity: function (entity) {
            if (this.check(entity) == true)
                return Promise.resolve();
            else
                return Promise.reject(new MoleculerClientError("Invalid fields!", 422, "", [{ field: "Invalid", message: "fields" }]));
        },
        generateJWT: function (user) {
            var today = new Date();
            var exp = new Date(today);
            exp.setDate(today.getDate() + 60);
            return jwt.sign({
                id: user._id,
                username: user.username,
                exp: Math.floor(exp.getTime() / 1000)
            }, this.settings.JWT_SECRET);
        },
        generateCustomJWT: function (user) {
            return jwt.sign({
                id: user._id,
                username: user.username
            }, this.settings.JWT_SECRET_ADS);
        },
        transformEntity: function (user, withToken, token) {
            if (user) {
                if (withToken)
                    user.token = token || this.generateJWT(user);
                else
                    user = _.pick(user, this.settings.fields);
            }
            return { user: user };
        },
    },
    created: function () {
        this.entityValidator = {
            username: { type: "string", min: 3, pattern: /^[a-zA-Z0-9]+$/ },
            password: { type: "string", min: 8 },
            email: { type: "email" },
            surname: { type: "string", min: 3, pattern: /^[a-zA-Z0-9]+$/ },
            name: { type: "string", min: 3, pattern: /^[a-zA-Z0-9]+$/ }
        };
        this.check = v.compile(this.entityValidator);
        this.newAd = true;
    },
    started: function () {
    },
    stopped: function () {
    }
};
