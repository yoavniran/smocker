# Smocker

## Install

> _npm install smocker --save-dev_


## Reference

you can pass in a configuration object with the following parameters:
> **port** - the server port to use (default: **9991**)

> **resources** - the path to where the resources for the responses will be loaded from (default: **"./resources"**)

> **requestPrefix** - the prefix to use for (all) requests when matching the url of an incoming request (default: **""**)

> **dynamicSymbol** - the symbol to use in the folder name to denote the dynamic/optional part(s). Must be a valid file name character (default: **"$"**)

> **addCorsHeader** - whether to add the [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS) headers to the response (default: **true**)

> **corsEchoRequestHeaders** - whether to echo the headers sent by a [preflight](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS#Preflighted_requests) request as the allowed cross origin request headers (default: **true**)

## Resources & Url Matching

When the server starts it looks at the folder configured as the resources and uses the folder names as the paths for matching incoming requests.

each folder name should be named after the resource path. for example, if the incoming request url is: "/api/orders/123" then the matching folder name should be: "api.orders.$"

The '$' symbol marks a placeholder that will match any path part regardless of the value. So 
"api.orders.$" will match incoming request "/api/orders/123" and "/api/orders/abc".

Incoming requests are matched using the [request url](https://nodejs.org/docs/latest-v0.12.x/api/http.html#http_message_url). 

### Mock Resources

Inside the resource folders a .js file should be placed named after the [method](https://nodejs.org/docs/latest-v0.12.x/api/http.html#http_message_method) the request used. 
So to match a GET request on "/api/orders/123" you should have the following file at: **"resources/api.orders.$/get.js"**

In this case "get.js" should be a normal node module returning either a json object or a function that returns a json object.
The object should have a **response** property which will be used for the response that will be sent to the client making the request.

The object can also have a statusCode property to use as the status of the response. Otherwise the response code will be 200.

In case a function is used, it should return the same object structure. The function will receive a reference to the incoming request and an options objects which will contain:

* **params**: the request URL parameters of the incoming request as a key/val pair. 
* **config**: the configuration passed to the start method. 
* **pathPars**: an array containing values of any dynamic path part used within the request. For example if the resource is "api.orders.$" and the request URL is "/api/orders/123" then "123" will be the first item in the pathPars array.

#### prefixing
In case all of the requests being mocked start the same path part for example: 
"/api/orders..." and "/api/users..." then the "/api" part can be anchored using the _requestPrefix_ configuration parameter. This will allow to name the resource folder "orders.$" instead of "api.oreders.$". Therefore the requestPrefix should have the value: "api"


## Example
call start() to start up the mock server:


``` javascript

var smocker = require("smocker")

smocker.start({
	resources: "../resources",
	port: 8090,
	requestPrefix: "api"	
});

```

Then in the folder called "resources" you can place the following structure:

* resources
	* orders.$
		* get.js

In get.js you can have this code:

``` javascript

module.exports = {
	response: {
		id: 123,
		customer: 56333,
		quantity: 2
	}
};

``` 

or use the function form:

``` javascript

module.exports = function(req, options){
	
	if (options.pathPars.length >0){ //request url includes order id

		return {
			response: {
				id: 123,
				customer: 56333,
				quantity: 2
			}
		};
	}
	else{
		return {
			 response: [
				{
					id: 123,
					customer: 56333,
					quantity: 2
				},
				{
					id: 456,
					customer: 52343,
					quantity: 1
				}
		]};
	}
};

```