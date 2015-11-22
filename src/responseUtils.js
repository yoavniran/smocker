import _ from "lodash";

/**
 * Use method when the response should be a file loaded from disk instead
 * @param filePath the path to load the file from
 * @param contentType
 * @param statusCode
 * @param statusMessage
 * @returns {Object}
 */
function respondWithFile(filePath, contentType, statusCode, statusMessage) {
	return {
		isFile: true,
		filePath: filePath,
		headers: {
			"content-type": contentType
		},
		statusCode: statusCode,
		statusMessage: statusMessage
	};
}

/**
 * Use method when the response should sometimes succeed and sometime fail
 * @param response the successful response
 * @param failRate determines the percentage of failed responses
 * @param failCode the code to use when failing (default: 500)
 * @param failMessage the message to use when failing (default: "failed due to fail-rate set up")
 * @returns {Object}
 */
function respondWithFailureRate(response, failRate, failCode, failMessage) {
	return _.extend({}, response, {
		dontCache: true,
		failRateData: {
			rate: failRate,
			code: failCode,
			message: failMessage
		}
	});
}

var utils = {};

Object.defineProperties(utils, {
	"respondWithFile": {
		get: function () {
			return respondWithFile;
		},
		enumerable: true
	},

	"respondWithFailureRate": {
		get: function () {
			return respondWithFailureRate;
		},
		enumerable: true
	}
});

export default utils;