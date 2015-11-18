# Smocker

[![Coverage Status](https://coveralls.io/repos/yoavniran/smocker/badge.svg?branch=master&service=github)](https://coveralls.io/github/yoavniran/smocker?branch=master)

* [Intro](#intro)
* [Install](#install)
* [API](#api)
* [Configuration](#config)
* [Resources & Url Matching](#resnmatch)
* [Mock Resources](#mocks)
* [Example](#example)
* [Binary Responses](#binResponse)
* [Change Log](#changelog)

<a id="intro"/> 
## Intro

A very simple HTTP server mocker loading mocked data from node modules.

 * write resources in an easy to manage folder structure
 * resources are simple node modules so they can be simple JSON or contain logic using functions
 * supports CORS for easy use during development 
 * supports jsonp

<a id="install"/> 
## Install

> _npm install smocker --save-dev_

<a id="api"/>
## API

> start (config)

Start a new instance of Smocker with the provided or default configuration. Internally starts a new http server.
Pass in a configuration object to override one or more of the defaults (See the [configuration](#config) section below for details).

returns a Promise that's resolved with a function that's when called will stop the running HTTP server.

> setDefaults (config)

changes the root defaults object for all future instances.
Use this method to update some or all of the defaults smocker uses when starting a new instance.

returns a clone object of the current defaults.

> restoreDefaults ()

restores the defaults object used to its original state.

returns a clone object of the restored defaults.

<a id="config"/> 
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

<a id="resnmatch"/> 
## Resources & Url Matching

When the server starts it looks at the folder configured as the resources and uses the folder names as the paths for matching incoming requests.

Each folder name should be named after the resource path. for example, if the incoming request url is: "/api/orders/123" then the matching folder name should be: "api.orders.$"

The URL separator character ("/") is marked with a "." in the folder name. that is why a mocked URL For http://myserver.com/api/orders will have a matched folder named "api.orders".

The '$' symbol marks a placeholder that will match any path part regardless of the value. So 
"api.orders.$" will match incoming request "/api/orders/123" and "/api/orders/abc".

Incoming requests are matched using the [request url](https://nodejs.org/docs/latest-v0.12.x/api/http.html#http_message_url). 


<a id="mocks"/> 
## Mock Resources

Inside the resource folders a .js file should be placed named after the [method](https://nodejs.org/docs/latest-v0.12.x/api/http.html#http_message_method) the request used. 
So to match a GET request on "/api/orders/123" you should have the following file at: **"resources/api.orders.$/get.js"**

In this case "get.js" should be a normal node module returning either a json object or a function that returns a json object.

The returned object can have the following properties:

* **response**: the response body that will be returned to the client
* **statusCode**: the code number that will be returned to the client (default: **200**)
* **statusMessage**: the message that will be returned to the client (default: **ok**)
* **headers**: a key/val map of headers to return to the client (default: **{content-type: "application/json"}**)

Another option is to use the function form for the mocked resource. The function is expected to have the following signature: fn(req, info, utils) 

In case a function is used, it should return the same object structure. 

The function will receive a reference to the incoming request (currently being handled) as the first argument. 

It will also receive an info object as the seconds argument which contains:

* **params**: the request URL parameters of the incoming request as a key/val pair. 
* **config**: the configuration passed to the start method. 
* **pathPars**: an array containing values of any dynamic path part used within the request. For example if the resource is "api.orders.$" and the request URL is "/api/orders/123" then "123" will be the first item in the pathPars array.
* **requestBody**: the body of the request if the request contained one and the __readRequestBody__ configuration parameter is set to true (default)

Finally, it receives a reference to a utils objects as the third argument. Currently the utils object has these methods:

> **respondWithFile** Use method when the response should be a file loaded from disk instead. See example [below](#fileResponse).

### prefixing
In case all of the requests being mocked start the same path part for example: 
"/api/orders..." and "/api/users..." then the "/api" part can be anchored using the _requestPrefix_ configuration parameter. This will allow to name the resource folder "orders.$" instead of "api.oreders.$". Therefore the requestPrefix should have the value: "api"

<a id="example"/> 
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

<a id="binResponse"/>
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

<a id="changelog">
## Change Log

### 0.2.1
* support for binary file responses
* test coverage up from 0 to ~75%
* improved code structure 
* minor bug fixes

### 0.1.0
* First Release