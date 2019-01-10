"use strict";

const { ServiceBroker } = require("moleculer");
const { ValidationError, MoleculerClientError } = require("moleculer").Errors;
const { AuthClientError } = require("../errors");
const MongoAdapter = require("moleculer-db-adapter-mongo");
const TestService = require("../services/users.service");
var {JsonWebTokenError} = require("jsonwebtoken");

describe("Test 'users' service", () => {
	let broker = new ServiceBroker();
	//broker.createService(TestService);
	let adapter;
	let userlogged;
	broker.createService(TestService, {
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
			adapter = this.adapter;
			this.adapter.clear();

		},


	});

	beforeAll(() => broker.start());
	afterAll(() => broker.stop());
	

	describe("Test 'users.create' with valid params", () => {
		let params = {
				user: {
					username:"keko",
					password:"gilberto1",
					email:"keko950@hotmail.com",
					surname:"plaza",
					name:"gilberto"
				}
		};
		it("should return a user", async () => {
			return await expect(broker.call("users.create",params,{})).resolves.toBeInstanceOf(Object);
		});
	});

	describe("Test 'users.create' with invalid params", () => {
		let params = {
				user: {
					username:"keko",
					password:"s",
					email:"keko950@hotmail.com",
					surname:"plaza",
					name:"gilberto"
				}
		};
		it("should fail", async () => {
			return await expect(broker.call("users.create",params,{})).rejects.toBeInstanceOf(MoleculerClientError);
		});
	});

	describe("Test 'users.login' with valid params", () => {
		let params = {
				user: {
					username:"keko",
					password:"gilberto1",
				}
		};
		
		it("should return a user", async () => {
			return await expect(broker.call("users.login",params,{})).resolves.toBeInstanceOf(Object);			
		});
	});	
	describe("Test 'users.login' with invalid params", () => {
		let params = {
				user: {
					username:"kekos",
					password:"gilberto1",
				}
		};
		it("should fail", async () => {
			return await expect(broker.call("users.login",params,{})).rejects.toBeInstanceOf(AuthClientError);
		});
	});	


	describe("Test 'users.me' when logged", () => {
		let context = {
			meta: {
				user: {
					username:"keko"
				}
			}
		};
		it("should return a user", async () => {
			return await expect(broker.call("users.me",{},context)).resolves.toBeInstanceOf(Object);
		});
	});	

	describe("Test 'users.me' while not logged", () => {
		let context = {
			meta: {
				user: {
					username:"keko"
				}
			}
		};
		it("should fail", async () => {
			return await expect(broker.call("users.me",{},{})).rejects.toBeInstanceOf(AuthClientError);
		});
	});	


	describe("Test 'users.getCustomJWT' with login action", () => {
		let context = {
			meta: {
				user: {
					username:"keko",
				}
			}
		};
		it("should return user custom token", async () => {
			return await expect(broker.call("users.getCustomJWT",{},context).then(resolved => {
				//console.log(resolved);
			})).resolves;
		});

	});

	describe("Test 'users.resolveToken' with valid params", () => {
		broker.call("users.login",{user: { username:"keko", password:"gilberto1"} },{}).then(user => {
			userlogged = user.user;
			return params = {
				token: userlogged.token
			};
		}).then(params => {it("should return a user", async () => {
			return await expect(broker.call("users.resolveToken",params,{})).resolves.toBeInstanceOf(Object);
		})});
	});	
/*
	describe("Test 'users.resolveToken' with valid params", () => {
		let params = {
					token: "fail"
		};
		it("should fail", async () => {
			return await expect(broker.call("users.resolveToken",params,{})).rejects.toBeInstanceOf(JsonWebTokenError);
		});
	});	
*/
	describe("Test 'users.updateMyself' with valid params", () => {
		let params = {
				user: {
					password:"gilberto2",
					email:"keko950@hotmail.com",
					surname:"plaza",
					name:"gilberto"
				}
		};
		
		broker.call("users.login",{user: { username:"keko", password:"gilberto1"} },{}).then(user => {
			userlogged = user.user;
			return {
				meta: {
					user: {
						username:"keko",
						_id: userlogged._id
					}
				}
			};
		}).then(context => {it("should update user", async () => {
			return await expect(broker.call("users.updateMyself",params,context)).resolves.toBeInstanceOf(Object);
		})});
	});

	describe("Test 'users.updateMyself' with invalid params", () => {
		let params = {
				user: {
					password:"s",
					email:"keko950@hotmail.com",
					surname:"plaza",
					name:"gilberto"
				}
		};

		broker.call("users.login",{user: { username:"keko", password:"gilberto1"} },{}).then(user => {
			userlogged = user.user;
			return params = {
				meta: {
					user: {
						username:"keko",
						_id: userlogged._id
					}
				}
			};
		}).then(context => {it("should fail", async () => {
			return await expect(broker.call("users.updateMyself",params,context)).rejects.toBeInstanceOf(ValidationError);
		})});
	});

	describe("Test 'users.getCustomJWT' action", () => {
		
		it("should return user auth error", async () => {
			return await expect(broker.call("users.getCustomJWT")).rejects.toBeInstanceOf(AuthClientError);
		});

	});
/*
	describe("Test 'users.welcome' action", () => {

		it("should return with 'Welcome'", () => {
			expect(broker.call("users.welcome", { name: "Adam" })).resolves.toBe("Welcome, Adam");
		});

		it("should reject an ValidationError", () => {
			expect(broker.call("users.welcome")).rejects.toBeInstanceOf(ValidationError);
		});

	});

	*/

});

