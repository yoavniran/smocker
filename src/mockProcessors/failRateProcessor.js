import Debug from "debug";
import crypto from "crypto";

const debug = Debug("smocker"),
	floor = Math.floor,
	BATCH_SIZE = 100,
	DEFAULT_FAIL_CODE = 500,
	DEFAULT_FAIL_MSG = "failed due to fail-rate set up",
	MAX_BYTE = 255,
	HUNDRED = 100;

function _getProcessor(requestCache) {
	return (req, res, responseData, options, next) => {

		if (options.config.allowFailureRate && !options.notFound && responseData.failRateData) {
			debug("failRateProcessor - activating fail-rate logic for request: " + req.url);
			_getResponse(requestCache, responseData, options, (newData)=> {
				next(newData); //allow the next processor to run or finish post-processing
			});
		}
		else { //not activating fail rate logic
			next(responseData);
		}
	};
}

function _getResponse(requestCache, responseData, options, cb) {

	_getRequestCallsData(options, requestCache, (callData)=> {

		let newData = responseData;

		if (callData.randomVals) {
			const currVal = callData.randomVals.shift(),
				{rate, code, message} = responseData.failRateData;

			if (currVal <= rate) { //fail the response
				newData = {
					statusCode: code || DEFAULT_FAIL_CODE,
					statusMessage: message || DEFAULT_FAIL_MSG
				};
			}
		}
		else {
			debug("failRateProcessor - failed to get random bytes, not failing response");
		}

		cb(newData);
	});
}

function _getRequestCallsData(options, requestCache, cb) {

	let callData = requestCache[options.resourcePath];

	if (!callData || !callData.randomVals || callData.randomVals.length === 0) { //first time or need a new random-values batch
		_getNewCallData((newData)=> {
			debug("failRateProcessor - creating a new call data for resource: " + options.resourcePath);
			requestCache[options.resourcePath] = newData;
			cb(newData);
		});
	}
	else {
		cb(callData);
	}
}

function _getNewCallData(cb) {

	_getCallsValues(BATCH_SIZE, (randomVals)=> {
		cb({
			randomVals: randomVals
		});
	});
}

function _getCallsValues(max, cb) {
	crypto.randomBytes(max, (err, bytes)=> {
		let vals;

		if (!err) {
			vals = [];
			for (let i = 0; i < max; i++) {
				vals.push(floor(bytes[i] / MAX_BYTE * HUNDRED));
			}
		}
		else {
			debug("failRateProcessor - error from crypto.randomBytes", err);
		}

		cb(vals);
	});
}

export default (/*config*/) =>{
	const requestCache = {};
	return _getProcessor(requestCache);
};