import _ from "lodash";
import Debug  from "debug";
import URL from "url-parse";

const debug = Debug("smocker");

export default (req, resources) =>{
	let reqUrl = req.url,
		reqMethod = req.method,
		result = {
			resourcePath: null,
			pathPars: []
		};

	_.find(resources,(res)=> { //cant use Array.find while supporting Node 0.12

		const parsed = new URL(reqUrl);
		let match = res.rgx.exec(parsed.pathname);

		if (match) {
			debug("requestMatcher - found matching resource dir for request: " + reqUrl);
			result.resourcePath = res.path + "/" + reqMethod.toLowerCase() + ".js";
			result.pathPars = match.slice(1);
		}

		return match; //no need to continue looking
	});

	return result;
};