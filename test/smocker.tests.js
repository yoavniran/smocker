"use strict";

//need this because tests here test code with promises and the promise swallows any assertion error so we break out
//from the promise flow by wrapping the stirrer done method with setTimeout
//todo: move to mocha-stirrer for other projects to benefit from
global.asyncTester = function asyncTester(fn) {
	"use strict";
	return function (done) {
		fn.call(this, function () {
			setTimeout(()=>done.apply(null, arguments), 1);
		});
	}
};

process.on("unhandledRejection", (error)=>{
	console.log("error!!!!! ", error);
});

require("../output/lib/index"); //set the baseline for coverage
//******************************************

require("./promisifySinonStub"); //adds rejects/resolves methods to sinon stubs
require("mocha-stirrer").RequireMocker.addGlobalDontMock(["debug", "lodash"]);
//******************************************

require("./utils.test");
require("./resourcesLoader.test");
require("./mockDataLoader.test");
require("./httpResponder.test");
require("./requestMatcher.test");
require("./responseUtils.test");

require("./mockProcessors.test");
require("./fileProcessor.test");
require("./failRateProcessor.test");

require("./smocker.test");