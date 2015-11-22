import {create as failRateCreator} from "./failRateProcessor";
import {create as fileResponseCreator} from "./fileProcessor";

function create(config) {
	const processors = [
		failRateCreator(config),
		fileResponseCreator(config)];

	return _getProcessingLogic(processors);
}

function _getProcessingLogic(processors) {
	return (req, res, responseData, options) => { //will be run for every response

		const runningProcessors = processors.slice();

		return new Promise((resolve)=> {

			const next = (data) => {
				responseData = data || responseData;
				runNext();
			};

			const runNext = () => {
				if (runningProcessors.length > 0) {
					const processor = runningProcessors.pop();
					processor(req, res, responseData, options, next);
				}
				else {
					resolve({req, res, responseData}); //we're done
				}
			};

			runNext();
		});
	};
}

export {create};