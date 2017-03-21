import createFailRateProcessor from "./failRateProcessor";
import createFileProcessor from "./fileProcessor";

const _getProcessingLogic = (processors) =>
	(req, res, responseData, options) => { //will be run for every response

		const runningProcessors = processors.slice(); //get a copy of processors

		return new Promise((resolve) => {

			const next = (data) => {
				responseData = data || responseData;
				runNext();
			};

			const runNext = () => {
				if (runningProcessors.length > 0) {
					const processor = runningProcessors.pop(); //take out the next processor
					processor(req, res, responseData, options, next);
				}
				else {
					resolve({req, res, responseData}); //we're done
				}
			};

			runNext();
		});
	};

export default (config) =>
	_getProcessingLogic([
		createFailRateProcessor(config),
		createFileProcessor(config)
	]);