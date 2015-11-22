import Debug from "debug";
const debug = Debug("smocker");
function create(/*config*/) {
	var requests = {};
	return _getProcessor(requests);
}
function _getProcessor(requests) {
	return (req, res, responseData, options, next) => {
		debug(requests);
		//if (options.config.allowFailureRate) {
		//}

		next(responseData);
	};
}

export {create};