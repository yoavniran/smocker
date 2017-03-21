/**
 * Use method when the response should be a file loaded from disk instead
 * @param filePath the path to load the file from
 * @param contentType
 * @param statusCode
 * @param statusMessage
 * @returns {Object}
 */
const respondWithFile = (filePath, contentType, statusCode, statusMessage) => ({
	isFile: true,
	filePath: filePath,
	headers: {
		"content-type": contentType
	},
	statusCode: statusCode,
	statusMessage: statusMessage
});

/**
 * Use method when the response should sometimes succeed and sometime fail
 * @param successData the successful response object to use (what would normally be the module's returned object)
 * @param failRate determines the percentage of failed responses
 * @param failCode the code to use when failing (default: 500)
 * @param failMessage the message to use when failing (default: "failed due to fail-rate set up")
 * @returns {Object}
 */
const respondWithFailureRate = (successData, failRate, failCode, failMessage) => ({
	...successData,
	dontCache: true,
	failRateData: {
		rate: failRate,
		code: failCode,
		message: failMessage
	}
});


const utils = {};

Object.defineProperties(utils, {
	"respondWithFile": {
		get() {
			return respondWithFile;
		},
		enumerable: true
	},

	"respondWithFailureRate": {
		get() {
			return respondWithFailureRate;
		},
		enumerable: true
	}
});

export default utils;