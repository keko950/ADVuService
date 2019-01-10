"use strict";
import * as Moleculer from "moleculer";
const { MoleculerError } 	= require("moleculer").Errors;
const _ = require("lodash");
const ApiGateway = require("moleculer-web");
const { UnAuthorizedError, ForbiddenError } = ApiGateway.Errors;
let fs = require("fs");
let path = require("path");
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
			//exposedHeaders: "*",
			credentials: true,
			maxAge: null
		},
		/*https: {
			key: fs.readFileSync(path.join(__dirname, "../cert/key.pem")),
			cert: fs.readFileSync(path.join(__dirname, "../cert/cert.pem"))
		},*/
		// Rate limiter
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
					extended:true
				}
			},

			onBeforeCall(ctx, route, req, res) {
				this.logger.info("onBeforeCall in /user route");
				/*
				if (ctx.meta.token)
					res.setHeader("Authorization", "Bearer "+ctx.meta.token);
				if (ctx.meta.user)
					res.setHeader("User", ctx.meta.user);
				*/
				//ctx.meta.authToken = req.headers["authorization"];
			},

			onAfterCall(ctx, route, req, res, data) {
				this.logger.info("onAfterCall in /user route");
				res.setHeader("X-Custom-Header", "Authorized path");
				/*
				if (ctx.meta.token)
					res.setHeader("Authorization", "Bearer "+ctx.meta.token);
				if (ctx.meta.user)
					res.setHeader("User", ctx.meta.user);
				if (ctx.meta.contenttype) {
					res.setHeader("Content-Type", ctx.meta.contenttype);
					//res.setHeader("Content-Length", data.size)
				}
				*/
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
					extended:true
				}
			},
			onBeforeCall(ctx, route, req, res) {
				this.logger.info("onBeforeCall in /unity route");
				ctx.meta.headers = req.headers;
				ctx.meta.remoteAdress = req.connection.remoteAddress;

					
			}
		}],
		onError(req, res, err) {
			// Return with the error as JSON object
			res.setHeader("Content-type", "application/json; charset=utf-8");
			res.writeHead(err.code || 500);

			if (err.code == 422) {
				let o = {};
				err.data.forEach(e => {
					let field = e.field.split(".").pop();
					o[field] = e.message;
				});

				res.end(JSON.stringify({ errors: o }, null, 2));
			} else {
				const errObj = _.pick(err, ["name", "message", "code", "type", "data"]);
				res.end(JSON.stringify(errObj, null, 2));
			}
			this.logResponse(req, res, err? err.ctx : null);
		}


	}, 
	methods: {
				/**
		 * Authorize the request
		 *
		 * @param {Context} ctx
		 * @param {Object} route
		 * @param {IncomingRequest} req
		 * @returns {Promise}
		 */
		authorize(ctx, route, req) {
			let token;
			if (req.headers.authorization) {
				let type = req.headers.authorization.split(" ")[0];
				if (type === "Token" || type === "Bearer")
					token = req.headers.authorization.split(" ")[1];
			}

			return this.Promise.resolve(token)
				.then(token => {
					if (token) {
						// Verify JWT token
						return ctx.call("users.resolveToken", { token })
							.then(user => {
								if (user) {
									this.logger.info("Authenticated via JWT: ", user.username);
									// Reduce user fields (it will be transferred to other nodes)
									ctx.meta.user = _.pick(user, ["_id", "username", "email", "name"]);
									ctx.meta.token = token;
									ctx.meta.userID = user._id;
								}
								return Promise.resolve(ctx);
							})
							.catch(err => {
								// Ignored because we continue processing if user is not exist
								return null;
							});
					}
				})
				.then(user => {
					if (req.$action.auth == "required" && !user)
						return this.Promise.reject(new UnAuthorizedError());
				});
		}
	}
};
