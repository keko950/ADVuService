const { MoleculerClientError } = require("moleculer").Errors;

/**
 * 'Client not Auth' Error message
 *
 * @class AuthClientError
 * @extends {MoleculerClientError}
 */
class AuthClientError extends MoleculerClientError {
	/**
	 * Creates an instance of ServiceNotFoundError.
	 *
	 * @param {Object} data
	 *
	 * @memberof AuthClientError
	 */
	constructor(message, type, data) {
		super(message, 422, type || "AUTH_ERROR", data);
	}
}

module.exports = {
    AuthClientError
}