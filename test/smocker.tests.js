require("../lib/index"); //set the baseline for coverage
//******************************************

require("mocha-stirrer").RequireMocker.addGlobalDontMock(["debug", "lodash"]);
//******************************************

require("./utils.test");
require("./resourcesLoader.test");
require("./mockDataLoader.test");
require("./httpResponder.test");