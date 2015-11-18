//var repl = require("repl");
//
//var instance = repl.start({
//    prompt: "smocker > "
//});
//
////console.log("repl eval = ", instance.eval);
//
//var orgEval = instance.eval;
//
//instance.eval = function(code, context, file, cb){
//    "use strict";
//
//    console.log("[smocker eval]: ", code);
//
//    orgEval.apply(null, arguments);
//};
//
//instance.context.server = (function(){
//    "use strict";
//
//    var smocker = require("./lib/index");
//
//
//
//})();