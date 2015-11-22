"use strict";
require("../lib/index"); //set the baseline for coverage
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

require("./smocker.test");