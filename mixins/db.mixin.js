"use strict";

const path = require("path");
const mkdir = require("mkdirp").sync;
const DbService	= require("moleculer-db");

module.exports = function(collec) {

	// Mongo adapter
	const MongoAdapter = require("moleculer-db-adapter-mongo");
	return {
		mixins: [DbService],
		adapter: new MongoAdapter(process.env.MONGO_URI || 'mongodb://localhost:27017/advu', {autoReconnect: false}),
		collection: collec
	};


};
