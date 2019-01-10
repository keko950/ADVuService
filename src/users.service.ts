
"use strict";
import * as fs from 'fs';
import { Context } from 'moleculer';
import { checkServerIdentity } from 'tls';
const DbService = require("../mixins/db.mixin");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const { MoleculerClientError } = require("moleculer").Errors;
const { AuthClientError } = require("../errors");
const v = require("../validators/validator");
const salt = bcrypt.genSaltSync(10);
//const Validator = require("fastest-validator");
//const v = new Validator();
//const fs = require('fs');
module.exports = {
	name: "users",
	mixins: [DbService("users")],
	/**
	 * Service settings
	 */
	settings: {
		JWT_SECRET: process.env.JWT_SECRET || "jwt-advu-top-secret",
		JWT_SECRET_ADS: process.env.JWT_SECRET_ADS || "jwt-advu-top-secret-forads",
		fields: ["_id", "username", "name", "surname", "email", "advToken"]
	},

	/**
	 * Service dependencies
	 */
	dependencies: [],	

	/**
	 * Actions
	 */
	actions: {
		/**
		 * Gets user custom JWT used to update metrics
		 *
		 * @returns {Object} Advertising token
		 */
		getCustomJWT: {
			auth: "required",
			handler(ctx) {
				if (ctx.meta.user) {
				let name = ctx.meta.user.username;
				return this.adapter.findOne({ username: name })
					.then(found => {
						if (found)
						return this.generateCustomJWT(found);
						else 
							return Promise.reject(new MoleculerClientError("Something went wrong", 422, "", [{ field:"Username", message: "not found"}]));
					});
				}
				else {
					return Promise.reject(new AuthClientError("Something went wrong", 403, "", [{ field: "User", message: "not found"}]));					
				}
			}
		},
		/**
		 * Register a new user
		 *
		 * @actions
		 * @param {Object} user - User entity
		 * @returns {Object} Created entity with token
		 */
		create: {
			params: {
				user: {type: "object"}
			},
			handler(ctx) {
				let entity = ctx.params.user;
				return this.validateEntity(entity)
					.then(() => {
						if (entity.username)
							return this.adapter.findOne({ username: entity.username})
								.then(found => {
									if (found)
										return Promise.reject(new AuthClientError("Username already exists!", 422, "", [{ field:"Username", message: "already exists"}]));
								});
					})
					.then(() => {
						if (entity.email)
							return this.adapter.findOne({ email: entity.email })
								.then(found => {
									if (found)
										return Promise.reject(new AuthClientError("Email already exists!", 422, "", [{ field: "Email", message: "already exists"}]));
								});
					})
					.then(() => {
						entity.password = bcrypt.hashSync(entity.password, salt);;
						return this.adapter.insert(entity)
							.then(user => this.transformEntity(user, false, ctx.meta.token));
					})
			}
		}, 
				/**
		 * User login
		 *
		 * @actions
		 * @param {Object} user - User oject with username and password
		 * @returns {Object} User entity & token
		 */
		login: {
			params: {
				user: {type : "object", prop: {
					username: { type: "string" },
					password: { type: "string", min: 1 }
				}}
			}, 
			handler(ctx) {
				let entity = ctx.params.user;
						if (entity.username)
							return this.adapter.findOne({ username: entity.username })
								.then(found => {
									if (!found) 
										return Promise.reject(new AuthClientError("Username not found",  "", [{ field:"Username", message: "not found"}]));									
									return bcrypt.compare(entity.password, found.password).then(res => {
										if (!res)
											return Promise.reject(new AuthClientError("Wrong password", "", [{ field: "Password", message: "not match"}]));
										else {
											ctx.meta.token = this.generateJWT(found);
											return this.transformEntity(found, true, ctx.meta.token);
										}																			
								});
							})
			}
		},
						/**
		 * User /me - returns myself
		 *
		 * @actions
		 * @returns {Object} User entity & token
		 */
		me: {
			auth: "required",
			handler(ctx) {
				
				if (ctx.meta.user) {
					let name = ctx.meta.user.username;
					return this.adapter.findOne({ username: name })
						.then(found => {
							if (found)
								return this.transformEntity(found,true,ctx.meta.token);
							else 
								return Promise.reject(new AuthClientError("Something went wrong", 403, "", [{ field:"Username", message: "not found"}]));
						});
			} else {
				return Promise.reject(new AuthClientError("Something went wrong", 403, "", [{ field:"Username", message: "not found"}]));
			}
		}
		},
								/**
		 * User resolveToken - token verification
		 *
		 * @actions
		 * @param {string} token - user token as string
		 * @returns {Object} User entity & token
		 */
		resolveToken: {
			params: {
				token: {type : "string"}
			},
			handler(ctx) {
				return new this.Promise((resolve, reject) => {
					jwt.verify(ctx.params.token, this.settings.JWT_SECRET, (err, decoded) => {
						if (err)
							return reject(err);

						resolve(decoded);
					});

				})
					.then(decoded => {
						if (decoded.id)
							return this.getById(decoded.id);
					});
			}
		},
								/**
		 * User update - returns updated user
		 *
		 * @actions
		 * @param {Object} user - User oject with changed values
		 * @returns {Object} User entity & token
		 */
		updateMyself: {
			params: {
				user: {type : "object", props: {
					password: { type: "string", optional: true, min:8 },
					email: {type: "email", optional: true},
					surname: { type: "string", min:3, optional: true, pattern:  /^[a-zA-Z0-9]+$/ },
					name: { type: "string", min:3, optional: true, pattern:  /^[a-zA-Z0-9]+$/ }
				}}
			},
			auth: "required",
			handler(ctx) {
				if (ctx.meta.user) {
					return this.adapter.findById(ctx.meta.user._id)
						.then(found => {
							let newData = ctx.params.user;
							if (newData.password) 
								found.password = bcrypt.hashSync(newData.password, salt);				
							if (newData.email)
								found.email = newData.email;
							if (newData.surname)
								found.surname = newData.surname;
							if (newData.name)
								found.name = newData.name;
							found.updatedAt = new Date();
							const update = {
								$set: found
							};
							return this.adapter.updateById(ctx.meta.user._id, update);
						})
						//.catch(user => this.logger.info(user));
				} else {
					return Promise.reject(new AuthClientError("Something went wrong", "", [{ field:"Username", message: "not found"}]));
				}
			}
		}

	},

	/**
	 * Events
	 */
	events: {

	},

	/**
 * Methods
	 */
	methods: {
				/**
		 * Validate the entity
		 *
		 * @param {Object} entity
		 * @returns {Promise}
		 */
		validateEntity(entity) {
			if (this.check(entity) == true)
				return Promise.resolve();
			else 
				return Promise.reject(new MoleculerClientError("Invalid fields!", 422, "", [{ field: "Invalid", message: "fields"}]));

		}, 

					/**
		 * Generate a JWT token from user entity
		 *
		 * @param {Object} user
		 */
		generateJWT(user) {
			const today = new Date();
			const exp = new Date(today);
			exp.setDate(today.getDate() + 60);

			return jwt.sign({
				id: user._id,
				username: user.username,
				exp: Math.floor(exp.getTime() / 1000)
			}, this.settings.JWT_SECRET);
		},
							/**
		 * Generate a JWT token from user entity 
		 *
		 * @param {Object} user
		 */
		generateCustomJWT(user) {
			return jwt.sign({
				id: user._id,
				username: user.username
			}, this.settings.JWT_SECRET_ADS);
		},
		/**
		 * Transform returned user entity. Generate JWT token if neccessary.
		 *
		 * @param {Object} user
		 * @param {Boolean} withToken
		 */
		transformEntity(user, withToken, token) {
			if (user) {
				if (withToken)
					user.token = token || this.generateJWT(user);
				else 
					user =  _.pick(user, this.settings.fields);
			}

			return { user };
		},
	},
	/**
	 * Service created lifecycle event handler
	 */
	created() {
        this.entityValidator =  {
			username: { type: "string", min:3, pattern:  /^[a-zA-Z0-9]+$/ },
			password: { type: "string", min:8 },
			email: {type: "email"},
			surname: { type: "string", min:3, pattern:  /^[a-zA-Z0-9]+$/ },
			name: { type: "string", min:3, pattern:  /^[a-zA-Z0-9]+$/ }
		};
        this.check = v.compile(this.entityValidator);
		this.newAd = true;
	},

	/**
	 * Service started lifecycle event handler
	 */
	started() {

	},

	/**
	 * Service stopped lifecycle event handler
	 */
	stopped() {

	}
};