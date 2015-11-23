var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    stirrer = require("mocha-stirrer");

describe("mock processors tests", function () {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

    var cup = stirrer.grind({
        stubs: {
            processor: stirrer.EMPTY
        },
        requires: [{
            path: "../output/lib/mockProcessors/index",
            options: {alias: "processors"}
        }],
        before: function () {
            this.getStub("mockProcessors/failRateProcessor").create.returns(this.stubs.processor);
            this.getStub("mockProcessors/fileProcessor").create.returns(this.stubs.processor);

            this.stubs.processor.callsArgWith(4, undefined);
        },
        after: function(){
            expect(this.stubs.processor).to.have.callCount(4);
        }
    });


    cup.pour("test processing - processors return undefined", function (done) {

        var processors = this.getRequired("processors");
        var run = processors.create();

        run({req: true}, {res: true}, {data: 123}, {})
            .then(function (data) {

                expect(data).to.exist();
                expect(data.req.req).to.be.true();
                expect(data.res.res).to.be.true();
                expect(data.responseData.data).to.equal(123);
            }, done)
            .then(done, done);
    });


    cup.pour("test processing - processors return response data", asyncTester(function (done) {

        var processors = this.getRequired("processors");
        var run = processors.create();

        run({req: true}, {res: true}, {data: 123}, {})
            .then(function (data) {

                expect(data).to.exist();
                expect(data.req.req).to.be.true();
                expect(data.res.res).to.be.true();

                expect(data.responseData).to.equal(cup.pars.processedData);

            }, done).then(done, done);
    }), {
        befores: function (next) {
            this.stubs.processor.callsArgWith(4, this.pars.processedData);
            next();
        },
        pars: {
            processedData: {data: 345}
        }
    });
});

function asyncTester(fn) {
    "use strict";
    return function (done) {
        fn.call(this, function () {
            setTimeout(done.apply(null, arguments), 1);
        });
    }
}