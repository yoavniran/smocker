const chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    stirrer = require("mocha-stirrer");

describe("request matcher tests", () => {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

	const cup = stirrer.grind({
        requires: [{
            path: "../output/lib/requestMatcher",
            options: {alias: "matcher"}
        }]
    });

    cup.pour("test match made", function() {

	    const matcher = this.getRequired("matcher");
	    const path = "api.test";

	    const result = matcher({url: "/api/test/123", method: "POST"}, [{rgx: /\/api\/test(?:\/?)([^\\/\\s\\?]*)/, path: path}]);

        expect(result).to.exist();
        expect(result.resourcePath).to.equal(path + "/post.js");
        expect(result.pathPars).to.contain("123");
    });

    cup.pour("test no match", function() {
	    const matcher = this.getRequired("matcher");
	    const path = "api.test";

	    const result = matcher({url: "/orders/test/123", method: "POST"}, [{rgx: /\/api\/test(?:\/?)([^\\/\\s\\?]*)/, path: path}]);

        expect(result).to.exist();
        expect(result.resourcePath).to.be.null();
        expect(result.pathPars).to.be.empty();
    });

    cup.pour("test no match on query param", ()=>{
	    const matcher = cup.getRequired("matcher"),
		    path = "orders";

	    const result = matcher({url: "http://test.com:9991/orders?sign=true", method: "POST"}, [{rgx: /sign/, path: path}]);

	    expect(result.resourcePath).to.be.null();
    });
});