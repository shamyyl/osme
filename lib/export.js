var file = require('file.js');
var database = require("./database.js");
var async = require('async.js');

var bincode = require("./binaryCode.js");
var simplification = require('./simplification');

function generatePath (regionsPaths, lookup) {
	var result = {},
		wayCounter = 1;

	function pushPath (paths, path) {
		if (path.length == 1)paths.push(path[0]);
		else paths.push(path);
	}

	for (var regionId in regionsPaths) {
		var regionPath = regionsPaths[regionId],
			lastPathId = 0,
			path = [],
			paths = [];
		for (var record in regionPath) {
			if (regionPath[record].pathId != lastPathId) {
				pushPath(paths, path);
				path = [];
				lastPathId = regionPath[record].pathId;
			}
			// Сжимаем номера путей
			var wid = regionPath[record].wayId;
			if (!lookup[wid]) {
				lookup[wid] = wayCounter++;
			}
			wid = lookup[wid];

			path.push(wid * regionPath[record].direction);
		}
		pushPath(paths, path);
		result[regionId] = paths;
	}
	return result;
}

function generateWay (ways, lookup, epsilon) {
	var simplyWays = {};

	for (var i in ways) {
		var decoded = bincode.decode(ways[i], 2);
		var wid = lookup[i];
		simplyWays[wid] = bincode.encode(simplification.simplify(decoded, epsilon));
	}
	return simplyWays;
}

function generateLongWay (trails, wayData, epsilon) {
	var simplyWays = {};

	for (var i in trails) {
		var path = [],
			trail = trails[i];
		for (var j in trail.path) {
			var decoded = bincode.decode(wayData[Math.abs(trail.path[j])], 2);
			if (trail.path[j] < 0) {
				decoded.reverse();
			}
			path.push.apply(path, decoded);
		}
		if (i < 0) {
			//i = Math.abs(i);
			//path.reverse();
		}
		simplyWays[i] = bincode.encode(simplification.simplify(path, epsilon));
	}
	return simplyWays;
}

/**
 * Оптимизирует пути, обьединяя соседние отрезки
 * @param path
 * @param ways
 */
function optimizePaths (paths, ways) {
	var lookup = {},
		wayRef = {},
		trails = {},
		regions = {},
		regionId, regionPath, record, wid, lastCnt, lastPathId,
		idCnt = 0;
	// Собираем статистику использования отрезков
	for (regionId in paths) {
		regionPath = paths[regionId];
		for (record in regionPath) {
			wid = regionPath[record].wayId;
			lookup[wid] = (lookup[wid] || []);
			lookup[wid].push(regionId);
		}
	}
	for (wid in lookup) {
		lookup[wid] = lookup[wid].sort().join('|');
	}
	//console.log(lookup);

	function pushPath (path, regionId, pathId, origin) {
		if (path.length == 0) {
			return;
		}
		if (path.length > 2) {
			// console.log(path[0],' is exr');
		}

		var path0 = path[0],
			pathN = path[path.length - 1],
			regionPath = path0;

		//встретили ровно свой хвост
		var wr = wayRef[-pathN];
		if (wr && trails[wr].end == -path0) {
			regionPath = -wr;
			console.log('used -back', pathN, origin);
			console.log(path0, pathN, path.length, ">", trails[wr].start, trails[wr].end, trails[wr].path.length, trails[wr].origin);
		} else/**/ {
			idCnt++;
			regionPath = idCnt;
			wayRef[path0] = idCnt;
			trails[idCnt] = {
				path: path,
				start: path0,
				end: pathN,
				origin: origin
			};
			// console.log(path0,origin, path.length);
		}
		regions[regionId] = regions[regionId] || [];
		regions[regionId][pathId] = regions[regionId][pathId] || [];
		regions[regionId][pathId].push(regionPath);
	}


	for (regionId in paths) {
		regionPath = paths[regionId];
		var rPaths = [];
		var path = [];
		// Собираем отдельные контуры
		lastPathId = 0;
		for (record in regionPath) {
			if (regionPath[record].pathId != lastPathId) {
				if (path.length) {
					rPaths.push(path);
					path = [];
				}
				lastPathId = regionPath[record].pathId;
			}
			path.push(regionPath[record]);
		}
		if (path.length) {
			rPaths.push(path);
		}

		//console.log(rPaths);


		for (var pathId in rPaths) {
			var currentPath = rPaths[pathId];
			var lastCnt = '';
			// Разворот пути на точку пересечения
			var endPath = currentPath.slice(0);
			for (var wid in currentPath) {
				var record = currentPath[wid];
				record.cnt = lookup[record.wayId];// DEBUG
				if (lastCnt != lookup[record.wayId]) {
					if (!lastCnt) {
						lastCnt = lookup[record.wayId]
					} else {
						//console.log('break rotate on ', wid, record, lastCnt,lookup[record.wayId]);
						break;
					}
				}
				//
				//console.log('roll',record);
				endPath.push(endPath.shift());
			}
			rPaths[pathId] = endPath;
			//console.log('end roll',endPath);
		}

		// Сбор длинных путей, отсечения в точках пересечения
		// Таким образом обеспечивается неподвижность этих точек
		for (var pathId in rPaths) {
			var currentPath = rPaths[pathId];
			var lastCnt = '';
			var path = [];
			for (var recordId in currentPath) {
				var record = currentPath[recordId];
				wid = record.wayId;
				if (lastCnt != lookup[wid]) {
					pushPath(path, regionId, pathId, 'break ' + lastCnt + ' != ' + lookup[wid]);
					lastCnt = lookup[wid];
					path = [];
				}
				path.push(wid * record.direction);
			}
			pushPath(path, regionId, pathId, 'end');
		}
	}

	return {
		paths: paths,
		ways: ways,
		trails: trails,
		regions: regions
	}
}

function saveData (query, regions, paths, ways, epsilon) {
	var trails = optimizePaths(paths, ways);

	var callback=query.file;
	var fileName=(query.path||'') + callback
	var resultObject = {
		regions: regions,
		paths: trails.regions,
		ways: generateLongWay(trails.trails, ways, epsilon)
	};

	file.write(fileName,
		'window["__osme__callback_' + callback + '"](' + JSON.stringify(resultObject) + ');'
	);
}


function getWays (regionPaths) {
	var ways = {};
	for (var regionId in regionPaths) {
		var regionData = regionPaths[regionId];
		for (var path in regionData) {
			ways[regionData[path].wayId] = true;
		}
	}
	return ways;
}

exports.process = function (query, callback) {
	console.log('queryRegions');
	database.queryRegions(query, function (regions) {
		console.log('get Paths');
		database.getRegionPaths(Object.keys(regions), function (regionPaths) {
			console.log('get Ways');
			var waysId = Object.keys(getWays(regionPaths));
			console.log('get Way Data');
			database.getPaths(waysId, function (ways) {
				console.log('saving');
				saveData(query, regions, regionPaths, ways, query.epsilon);
				callback();
			});
		});
	});

}