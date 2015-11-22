var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai");

describe("response utils tests", function () {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

    var resUtils = require("../output/lib/responseUtils");

    it("should respond with file", function () {

        var filePath = "aaa/bbb",
            contentType = "json",
            code = 200,
            msg = "yes";

        var response = resUtils.respondWithFile(filePath, contentType, code, msg);

        expect(response).to.exist();
        expect(response.isFile).is.true();
        expect(response.filePath).is.equal(filePath);
        expect(response.headers["content-type"]).equals(contentType);
        expect(response.statusCode).is.equal(code);
        expect(response.statusMessage).is.equal(msg);
    });

    it("should respond with failure based on rate", function () {

        var data = {foo: "bar"},
            msg = "a ok",
            failMsg= "oh no",
            headers = {
                "hello": "world"
            };

        var response = resUtils.respondWithFailureRate({
            response: data,
            statusCode: 200,
            statusMessage: msg,
            headers: headers
        }, 30, 503, failMsg);

        expect(response.response).to.equal(data);
        expect(response.statusCode).to.equal(200);
        expect(response.statusMessage).to.equal(msg);
        expect(response.headers).to.equal(headers);

        expect(response.failRateData).to.exist();
        expect(response.failRateData.rate).to.equal(30);
        expect(response.failRateData.code).to.equal(503);
        expect(response.failRateData.message).to.equal(failMsg);
    });
});

