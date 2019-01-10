
"use strict";
import * as fs from 'fs';
import { Context } from 'moleculer';
const DbService = require("../mixins/db.mixin");
const jwt = require("jsonwebtoken");
const { MoleculerClientError } = require("moleculer").Errors;
const ads = require("../ads/ads.config.js");
//const fs = require('fs');
module.exports = {
	name: "unity",
	mixins: [DbService("users")],

	/**
	 * Service settings
	 */
	settings: {
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
		 * Return ads version
		 *
		 * @returns
		 */
		check: {
			handler(ctx) {
				return ads.version;
			}
		},
				/**
		 * Forces version change in order to update advertisement on clients.
		 *
		 * @returns
		 */
		change: {
			handler(ctx) {
				ads.version += 1;
				let file = require("../ads/ads.config.js");
				file.version += 1;
				fs.writeFile("../ads/ads.config.js", JSON.stringify(file), function (err) {
					if (err) return console.log(err);
				  });
			}
		},
		/**
		 * Serve an advertisement
		 *
		 */
		serve: {
			handler(ctx: Context) {
				ctx.meta.$responseType = 'image/png';
				return fs.createReadStream(ads.advList[Math.floor((Math.random() * ads.advList.length) + 0)]);
			}
		},
		/**
		 * Returns player ip
		 *
		 */
		getIp: {
			handler(ctx) {
				ctx.meta.$responseType = 'text/plain';
				return ctx.meta.remoteAdress;
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
		resolveToken(token) {
			return new this.Promise((resolve, reject) => {
				jwt.verify(token, this.settings.JWT_SECRET_ADS, (err, decoded) => {
					if (err)
						return reject(err);

					resolve(decoded);
				});

			})
				.then(decoded => {
					if (decoded.id)
						return this.adapter.findById(decoded.id);
				});
		}
	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {
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