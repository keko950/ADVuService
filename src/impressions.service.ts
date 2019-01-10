
"use strict";
import { Context } from 'moleculer';
const DbService = require("../mixins/db.mixin");
const jwt = require("jsonwebtoken");
const { MoleculerClientError, ValidationError, MoleculerError, ServiceNotAvailableError } = require("moleculer").Errors;
const _ = require("lodash");
const v = require("../validators/validator");
const ads = require("../ads/ads.config.js");
const http = require('http');
//const fs = require('fs');
module.exports = {
    name: "impressions",
    mixins: [DbService("impressions")],

	/**
	 * Service settings
	 */
	settings: {
		JWT_SECRET: process.env.JWT_SECRET || "jwt-advu-top-secret",
		JWT_SECRET_ADS: process.env.JWT_SECRET_ADS || "jwt-advu-top-secret-forads",
		apikey: "daec5229f833fcbf435649c934058df0"
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
		 * Insert impression into db
		 *
		 * @param {String} ip - User ip
         * @param {Date} date - Impression date
         * @param {String} apiKey - User advertisement api Key
         * 
		 */
		create: {
            //visibility: "public",
			params: { 
                ip: { type: "string" },
				date: { type: "string" },
				apikey: { type: "string" },
			},
			handler(ctx: Context) {
				let impression = {
					ip: ctx.params.ip,
					date: new Date(ctx.params.date),
					userId: "",
					localization: "",
					earn: ""
				};
                let entity = impression;
				if (ctx.meta.headers.comefromunity) {
					return this.resolveAdsToken(ctx.params.apikey)
					.then(id => {
						entity.userId = id;
						let ret = this.validateEntity(entity);
						if (ret == true)
						{
							http.get("http://api.ipstack.com/"+entity.ip+"?access_key="+this.settings.apikey+"&format=1", (res) => {
								res.on('data', (d) => {
									let obj = JSON.parse(d);
									entity.localization = obj.country_code;
									if (entity.localization != null) {
										entity.earn = this.getRevenue(entity.localization);
										this.adapter.insert(entity);
									}
								});

								res.on('error', (err) => {
									return Promise.reject(new ServiceNotAvailableError("Localization service not working", 404, "", [{ field: "localization", message: "invalid"}]));
								})
							});
							
						} 	else {
								return this.Promise.reject(new ValidationError("Validation Error", 422, [{ field: "ComeFromUnity", message: "invalid"}]));
						}
					}); 
				}
				else {
					return this.Promise.reject(new ValidationError("Validation Error", 422, [{ field: "ComeFromUnity", message: "invalid"}]));
			}
		}
	},
		/**
		* User getImpressions method - returns impressions applying a filter
		*
		* @actions
		* @param {string} ip - Player ip - Optional
		* @param {string} loc - Player localization - Optional
		* @returns {Object} { number: number of impressions, earn: total revenue by those impressions}
		*/
		getImpressions: {
			auth: "required",
			params: {
				ip: {type: "string" , optional: true},
				loc: {type: "string" , optional: true},
				date1: {type: "string", optional: true},
				date2: {type: "string", optional: true}
			},
			handler(ctx: Context) {
				return this.resolveToken(ctx.meta.token)
					.then(id => {
						let query = { query: {userId: id.id} };
						if (ctx.params.ip)
							query.query["ip"] = ctx.params.ip;
						if (ctx.params.loc)
							query.query["localization"] = ctx.params.loc;
						if (ctx.params.date1 && ctx.params.date2)
							query.query["date"] = { 
								"$gte": new Date(ctx.params.date1),
								"$lt": new Date(ctx.params.date2)
							};
						return this.adapter.find( query )
						.then(found => {
							if (found) {
								/*let revenue = found.reduce((acc, item) => {
										return (acc + item.earn) ;
								}, 0);
								return {number: found.length, earn: revenue};
								*/
								return found;
							}
							else 
								return Promise.reject(new MoleculerClientError("Something went wrong", 422, "", [{ field: "userId", message: "impressions not found"}]));
						});
					})



            },
		},
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
		* User resolveToken - token verification
		*
		* @actions
		* @param {string} token - User token as string
		* @returns {Promise} promise with user id 
		*/
	   resolveToken(token) {
			   return new this.Promise((resolve, reject) => {
				   jwt.verify(token, this.settings.JWT_SECRET, (err, decoded) => {
					   if (err)
						   return reject(err);

					   resolve(decoded);
				   });

			   })
		   },
		   		/**
		* User resolveAdsToken - token verification
		*
		* @actions
		* @param {string} token - user advertisement (custom) token as string
		* @returns {Object} UserId
		*/
		resolveAdsToken(token) {
			return new this.Promise((resolve, reject) => {
				jwt.verify(token, this.settings.JWT_SECRET_ADS, (err, decoded) => {
					if (err)
					return reject(new ValidationError("Validation Error", 422, [{ field: "Token", message: "invalid" }]));

					resolve(decoded);
				});

			})
				.then(decoded => {
					return decoded.id;
				});
		},
				   		/**
		* Validate Entity - impression verification
		*
		* @actions
		* @param {string} entity - impression entity
		* @returns {Bool} validated result
		*/
		validateEntity(entity) {
			let ret = this.check(entity);
			if (ret == true)
				return true;
			else 
				return ret;

		}, 
		/**
		* Returns localization revenue per impression
		*
		* @actions
		* @param {string} localization - Impression localization
		* @returns {number} how much earnt by impression
		*/
		getRevenue(localization) {
			let res = ads.revenue.find(function(item) {
				return item.localization == localization;
			});
			if (res)
				return res.earn;
			else 
				return 0.0;
		}
	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {
        this.entityValidator =  {
			ip: { type: "string", min:7, pattern:  /^[0-9\\.]+$/ },
			//04/01/2014 23:23:23 example date pattern
			//date: { type: "string" , pattern: /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/\d\d\d\d (00|[0-9]|1[0-9]|2[0-3]):([0-9]|[0-5][0-9]):([0-9]|[0-5][0-9])$/}
		};
        this.check = v.compile(this.entityValidator);
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