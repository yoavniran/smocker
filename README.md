# Smocker

[![Build Status](https://travis-ci.org/yoavniran/smocker.svg)](https://travis-ci.org/yoavniran/smocker)
[![Coverage Status](https://coveralls.io/repos/yoavniran/smocker/badge.svg?branch=master&service=github)](https://coveralls.io/github/yoavniran/smocker?branch=master)
[![npm version](https://badge.fury.io/js/smocker.svg)](http://badge.fury.io/js/smocker)
[![Codacy Badge](https://api.codacy.com/project/badge/grade/8f1b6cae280d474c8b6f819f4a007d47)](https://www.codacy.com/app/yoavniran/smocker)
[![Built with Grunt](https://cdn.gruntjs.com/builtwith.png)](http://gruntjs.com/)

* [Intro](#intro)
* [Install](#install)
* [API](#api)
* [Configuration](#configuration)
* [Resources & Url Matching](#resources--url-matching)
* [Mock Resources](#mocks)
* [Example](#example)
* [Binary Responses](#binary-responses)
* [Fail-rate Responses](#fail-rate-responses)
* [Change Log](#change-log)

## Intro

A very simple HTTP server mocker loading mocked data from node modules.

 * write resources in an easy to manage folder structure
 * resources are simple node modules so they can be simple JSON or contain logic using functions
 * supports CORS for easy use during development 
 * supports jsonp

__Smocker relies on a simple folder and file naming convention so there is hardly any code needed to get started.__

## Install

> _npm install smocker --save-dev_

## API

> start (config)

Start a new instance of Smocker with the provided or default configuration. Internally starts a new http server.
Pass in a configuration object to override one or more of the defaults (See the [configuration](#configuration) section below for details).

returns a Promise that's resolved with a function that's when called will stop the running HTTP server.

> setDefaults (config)

changes the root defaults object for all future instances.
Use this method to update some or all of the defaults smocker uses when starting a new instance.

returns a clone object of the current defaults.

> restoreDefaults ()

restores the defaults object used to its original state.

returns a clone object of the restored defaults.

## Configuration

you can pass in a configuration object with the following parameters:

> **port** - the server port to use (default: **9991**)

> **resources** - the path to where the resources for the responses will be loaded from (default: **"./resources"**)

> **requestPrefix** - the prefix to use for (all) requests when matching the url of an incoming request (default: **""**)

> **dynamicSymbol** - the symbol to use in the folder name to denote the dynamic/optional part(s). Must be a valid file name character (default: **"$"**)

> **addCorsHeader** - whether to add the [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS) headers to the response (default: **true**)

> **corsAllowedOrigin**  - the hosts to allow when CORS is enabled (default: **" * "**)

> **corsEchoRequestHeaders** - whether to echo the headers sent by a [preflight](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS#Preflighted_requests) request as the allowed cross origin request headers (default: **true**)

> **headers** - a key/val map of default headers to send with every response (default: **{content-type: "application/json"}**)

> **cbParName** - the url parameter name to use as the callback function name for jsonp (default **"cb"**)

> **okStatusCode** - the default status code to set on the response (default: **200**)

> **okStatusMessage** - the default status message to set on the response (default: **"ok"**)

> **readRequestBody** - whether to read the body of incoming requests and pass it to the resource module (when using function form) (default: **true**)

> **cacheResponses** - whether to cache the mocked modules after they are first loaded to improve performance. Value can be Boolean or a valid positive integer. If set to true will cache all modules. if set to a number will remove old items from cache as it fills up (default: **50**)

> **allowFailureRate** - globally control whether to allow failure rate responses or ignore it (using the utils.respondWithFailureRate()) (default: **true**)

## Resources & Url Matching

When the server starts it looks at the folder configured as the resources and uses its sub-folders' names as the paths for matching incoming requests.

Each folder name should be named after the resource path. for example, if the incoming request url is: "/api/orders/123" then the matching folder name should be: "api.orders.$"

The URL separator character ("/") is marked with a "." in the folder name. that is why a mocked URL For http://myserver.com/**api/orders** will have a matched folder named **"api.orders"**.

The '$' symbol marks a placeholder that will match any path part regardless of the value. So 
"api.orders.$" will match incoming request "/api/orders/123" and "/api/orders/abc".

Incoming requests are matched using the [request url](https://nodejs.org/docs/latest-v0.12.x/api/http.html#http_message_url). 


## Mock Resources

Inside the resource folders a .js file should be placed named after the [method](https://nodejs.org/docs/latest-v0.12.x/api/http.html#http_message_method) the request used. 
So to match a GET request on "/api/orders/123" you should have the following file at: **"resources/api.orders.$/get.js"**

In this case "get.js" should be a normal node module exporting either a json object or a function that returns a json object.

The exported object or object returned from the exported function can have the following properties:

* **response**: the response body that will be returned to the client
* **statusCode**: the code number that will be returned to the client (default: **200**)
* **statusMessage**: the message that will be returned to the client (default: **ok**)
* **headers**: a key/val map of headers to return to the client (default: **{content-type: "application/json"}**)

Another option is to use the function form for the mocked resource. The function is expected to have the following signature: fn(req, info, utils) 

In case a function is used, it should return the same object structure as described [above](#mock-resources). 

The function will receive a reference to the incoming request (currently being handled) as the first argument. 

It will also receive an info object as the second argument which contains:

* **params**: the request URL parameters of the incoming request as a key/val pair. 
* **config**: the configuration that was used when the instance [start](#api) method was called. 
* **pathPars**: an array containing values of any dynamic path part used within the request. For example if the resource is "api.orders.$" and the request URL is "/api/orders/123" then "123" will be the first item in the pathPars array.
* **requestBody**: the body of the request if the request contained one and the _readRequestBody_ configuration parameter is set to true (default).

Finally, it receives a reference to a utils objects as the third argument. Currently the utils object has these methods:

> **respondWithFile** Use method when the response should be a file loaded from disk instead of string/json. See example [below](#binary-responses).

> **respondWithFailureRate** Use method when the response should sometimes succeed and sometime fail. See example [below](#fail-rate-responses). The server uses a randomizing algorithm to try and get a more realistic failure experience. 


### prefixing
When all of the requests being mocked start with the same path part for example: 
"/api/orders..." and "/api/users..." then the "/api" part can be anchored using the _requestPrefix_ configuration parameter. This will allow to name the resource folder "orders.$" instead of "api.oreders.$". In this case the requestPrefix should have the value: "api"

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

### Responses
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

module.exports = function(req, info, utils){
	
	if (info.pathPars.length >0){ //request url includes order id

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

with function form you can respond with a promise:

```javascript

module.exports = function(req, info, utils){

	return new Promise((resolve, reject)=>{
		//... do your logic here
		
		//either resolve
		resolve({
			response: {
				id: 123,
                customer: 56333,
                quantity: 2
			}
		});
		
		//or reject
		//reject("something bad happened");
	});
};

```

> a rejected promise will be handled and a 500 error will be returned to the client

## Binary Responses

At times you may wish to respond with a binary file rather than a text(typically JSON) response.
This is possible and made easy by using the utils method: **respondWithFile** that is passed as part of the utils object (third argument) to the mock module when in function form.

The **respondWithFile** method has the following signature: 

``` javascript
	respondWithFile(filePath, contentType, statusCode, statusMessage)
```

> **filePath** is either a relative or absolute path to the file to be streamed to the response. If its relative then smocker will attempt to locate it relative to the module that required smocker (same as with the resources)

> **contentType** should preferably match the content type of the file returned to the client

> **statusCode** and **statusMessage** are optional and will default to the configuration

Below is an example of a mock module returning a file (randomly choosing between 4 image files):

``` javascript

module.exports = function (req, options, utils) {

    var imgNumber = ((Math.floor(Math.random() * 4) + 1) % 4); //only have 4 images

    return utils.respondWithFile("./files/dynamic_" + imgNumber + ".png", "image/png");
};

```


If the mock module's path is at: _<project_root>/test/resources/dynamic.image/get.js_ and assuming that the module that required smocker is at: _<project_root>/test/app.js_ then the image file(s) should be stored at: _<project_root>/test/files/_

In case the URL of the binary file you wish to mock is using a file name for example: __http://myserver.com/images/dynamic.jpg__ then you should place the mock resource module at: _<project_root>/test/resources/images/dynamic..jpg_ - the double dot  ("..") allows Smocker to turn the mocked URL into a single dot at run time instead of switching the single dot into the separator character ("/").


## Fail-rate Responses

At times you may wish to check how your client behaves when the API it calls fails. There are different ways to achieve this but wouldn't it be nice to make it as realistic as possible? 
Using this utility, you can set (percentage-wise) how many of the calls to this API will fail.
The server will attempt to randomly respond either successfully or with a failure within the fail-rate specified.

> _Responses with fail-rate enabled aren't cached_.
  
The **respondWithFailRate** method has the following signature: 

``` javascript
	respondWithFailureRate(response, failRate, failCode, failMessage)
```

> **successData** the successful response object to use (what would normally be the module's returned object, can include: [see above](#responses))

> **failRate** determines the percentage of failed responses (integer between 0 and 100)

> **failCode** the code to use when failing (default: 500)

> **failMessage** the message to use when failing (default: "failed due to fail-rate set up") 

Below is a code sample showing its usage:

```javascript

module.exports = function(req, options, utils){
	
	return utils.respondWithFailureRate({
				response: { //the body of the response when successful				 
					info: "foo"
				},
				statusCode: 201,
			}, 
			90, //the failure rate = 90%
			501, //the code to use when failing
			"failed on purpose" //the message to use when failing
};

```

## Change Log

### 1.0.0
* added possibility to return promise from function form module
* added .editorconfig

### 0.3.0
* added fail-rate response utility method ([details](#fail-rate-responses))
* added post-processing pipe line (internal only currently)
* code base now entirely written in ES6 (using Babel)
* full test coverage (using [mocha-stirrer](https://www.npmjs.com/package/mocha-stirrer))
* using es-list instead of jshint

### 0.2.1
* support for binary file responses
* test coverage up from 0 to ~75%
* improved code structure 
* minor bug fixes

### 0.1.0
* First Release