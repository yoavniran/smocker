var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    stirrer = require("mocha-stirrer");

describe("request matcher tests", function () {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

    var cup = stirrer.grind({
        requires: [{
            path: "../output/lib/requestMatcher",
            options: {alias: "matcher"}
        }]
    });

    cup.pour("test match made", function(){

        var matcher = this.getRequired("matcher");
        var path = "api.test";

        var result = matcher.match({url: "/api/test/123", method: "POST"}, [{rgx: /\/api\/test(?:\/?)([^\\/\\s\\?]*)/, path: path}]);

        expect(result).to.exist();
        expect(result.resourcePath).to.equal(path + "/post.js");
        expect(result.pathPars).to.contain("123");
    });

    cup.pour("test no match", function(){
        var matcher = this.getRequired("matcher");
        var path = "api.test";

        var result = matcher.match({url: "/orders/test/123", method: "POST"}, [{rgx: /\/api\/test(?:\/?)([^\\/\\s\\?]*)/, path: path}]);

        expect(result).to.exist();
        expect(result.resourcePath).to.be.null();
        expect(result.pathPars).to.be.empty();
    })
});