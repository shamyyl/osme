var SERVER_PORT = 8812;

var http = require("http");
var url = require("url");
var querystring = require("querystring");

var connection = require('../lib/initConnection.js');
var geocode = require("../lib/backgeocode.js").geocode;


function start () {

	var concurentRequests = 0;
	var counter = 0;

	function processRequest (request, response, completeCallback) {
		var params = url.parse(request.url);
		//response.setEncoding('utf8');


		if (params.pathname == '/geocode') {
			geocodePath(request, response, params, completeCallback);
		} else {
			response.writeHead(504, {
				"Content-Type": "application/x-javascript;charset=utf-8"
			});
			response.end();
			completeCallback();

		}
	}

	function geocodePath (request, response, params, completeCallback) {
		var query = querystring.parse(params.query);

		var thisCounter = counter++;
		concurentRequests++;
		var startTime = +(new Date());
		console.log("Request received.", thisCounter, concurentRequests, query, request.headers['user-agent']);
		response.writeHead(200, {
			"Content-Type": "application/x-javascript;charset=utf-8"
		});

		var center = query.point.split(',');
		var settings = {
			verbose: true
		};
		if (query.exlevel) {
			settings.level = query.exlevel;
		}
		if (query.fullPath) {
			settings.fullPath = true;
		}
		if (query.withTags) {
			settings.withTags = true;
		}
		var coordinate = [parseFloat(center[0].trim()), parseFloat(center[1].trim())];

		function onResults (results) {

			var timePass = +(new Date()) - startTime;

			console.log('result:', thisCounter, concurentRequests, timePass, results);
			console.log('*****END****');


			if (!results) {
				results = {
					error: true, nomatch: true
				};
			} else {
				if (query.level) {
					var trace = results.trace;
					var newtrace = {};
					var hitId = 0;
					var maxLevel = 0;
					for (var rid in trace) {
						maxLevel = Math.max(maxLevel, trace[rid].level);
						if (trace[rid].level <= query.level) {
							newtrace[rid] = trace[rid];
							if (trace[rid].level == query.level) {
								hitId = rid;
							}
						}
					}
					results.trace = newtrace;
					results.hit = hitId;
					if (!hitId) {
						console.log('no hit');
						if (maxLevel > 2 && maxLevel > query.level) {
							settings.level = maxLevel - 1;
							console.log('go to', maxLevel - 1);
							geocode(coordinate, settings, onResults);
							return;
						}

					}
				}
			}
			results.requestId = thisCounter;
			results.timeTaken = timePass;
			results.concurent = concurentRequests;
			if (query.seq) {
				results.sequence = query.seq;
			}

			var json = JSON.stringify(results, null, '    ');

			if (query.callback) {
				response.write(query.callback + "(" + json + ");");
			} else {
				response.write(json);
			}

			concurentRequests--;
			response.end();

			process.nextTick(completeCallback);
		};

		geocode(coordinate, settings, onResults);
	}


	// Ограничивает количество параллельно исполняемых действий
	var executer = new (require('executer.js'))(4);


	function onRequest (request, response) {
		console.log('incoming request', request.connection.address(), request.connection.remotePort);
		process.nextTick(function () {
			executer.add(function (completeCallback) {
				processRequest(request, response, completeCallback);
			});
		});
	}

	http.createServer(onRequest).listen(SERVER_PORT);
	console.log("Server has started.");
}

function exceptionHandler (e) {
	console.error(e);
}

//process.addListener('uncaughtException', exceptionHandler);

start();