"use strict";

const { ServiceBroker } = require("moleculer");
const { ValidationError, MoleculerClientError } = require("moleculer").Errors;
const { AuthClientError } = require("../errors");
const MongoAdapter = require("moleculer-db-adapter-mongo");
const impressionsService = require("../services/impressions.service");
const usersService = require("../services/users.service");
var {JsonWebTokenError} = require("jsonwebtoken");

describe("Test 'impressions' service", () => {
	let broker = new ServiceBroker();
	//broker.createService(TestService);
	let adapter;
	let userlogged;
	broker.createService(impressionsService, {
		name: "impressions",
		adapter: new MongoAdapter(process.env.MONGO_URI || 'mongodb://localhost:27017/advu'),
		collection: "impressions",
		settings: {},

		actions: {
			clear: {
				handler(ctx) {
					this.adapter.clear();
				}
			},
		},
		
		afterConnected() {
			this.logger.info("Connected successfully");
			adapter = this.adapter;
			this.adapter.clear();

		},


	});

	broker.createService(usersService, {
		name: "users",
		adapter: new MongoAdapter(process.env.MONGO_URI || 'mongodb://localhost:27017/advu'),
		collection: "users",
		settings: {},

		actions: {
			clear: {
				handler(ctx) {
					this.adapter.clear();
				}
			},
		},
		
		afterConnected() {
			this.logger.info("Connected successfully");
		},


	});


	beforeAll(() => broker.start());
	afterAll(() => broker.stop());
	

	describe("Test 'impressions.create' with valid params", () => {
		let params = {
					ip:"83.165.62.84",
					date:"04/01/2014 23:23:23",
					apikey:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVjMTgwYmQ0ZmU5ZGI4MGU1MGMzNDgzOSIsInVzZXJuYW1lIjoia2VrbyIsImlhdCI6MTU0NTA3OTc2NH0.IXpZub6H5TqkIJ6pznB1v3r8wEstXLQCoUYgRKobMWs"
				};
		let context = {
			meta: {
				headers: {
					comefromunity: true
				}
			}
		};
		it("should return a resolved promise", async () => {
			return await expect(broker.call("impressions.create",params,context)).resolves;
		});


	});


	describe("Test 'impressions.create' with invalid params", () => {
		let params = {
					ip:"83.165.62.84",
					date:"04/01/2014 23:23:23",
					apikey:"dsdseyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVjMTgwYmQ0ZmU5ZGI4MGU1MGMzNDgzOSIsInVzZXJuYW1lIjoia2VrbyIsImlhdCI6MTU0NTA3OTc2NH0.IXpZub6H5TqkIJ6pznB1v3r8wEstXLQCoUYgRKobMWs"
				};
		let context = {
			meta: {
				headers: {
					comefromunity: true
				}
			}
		};
		it("should return token error", async () => {
			return await expect(broker.call("impressions.create",params,context)).rejects.toBeInstanceOf(ValidationError);
		});


	});


	describe("Test 'impressions.get' with valid params", () => {
		let params = {
			ip:"83.165.62.84",
			loc: "ES",
			date1: "06/06/2006",
			date2: "06/06/2019"
				};
		it("should return one impression", async () => {
			return await expect(broker.call("impressions.getImpressions",params,{})).resolves;
		});


	});

});

