"use strict";
require("./promisifySinonStub");
require("../lib/index"); //set the baseline for coverage
//******************************************

require("mocha-stirrer").RequireMocker.addGlobalDontMock(["debug", "lodash"]);
//******************************************

require("./utils.test");
require("./resourcesLoader.test");
require("./mockDataLoader.test");
require("./httpResponder.test");
require("./requestMatcher.test");
require("./smocker.test");