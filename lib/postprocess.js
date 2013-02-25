var bincode = require("./binaryCode.js");
var database = require("./database.js");
var countor = require("./countor.js");
var async = require("async.js");
var wayManager = require('./way.js');
var conf = require("./config.js");

function getWayBounds (nodes) {
	var min = nodes[0].slice(0),
		max = nodes[0].slice(0);

	for (var i = 1, l = nodes.length; i < l; i++) {
		if (!nodes[i]) {
			console.log(i, nodes.length, nodes[i], ">>");
			for (var j = 1; j < l; j++) {
				console.log(j, nodes[j]);
			}
		}
		min[0] = Math.min(min[0], nodes[i][0]);
		min[1] = Math.min(min[1], nodes[i][1]);
		max[0] = Math.max(max[0], nodes[i][0]);
		max[1] = Math.max(max[1], nodes[i][1]);
	}
	return [min, max];
}

function saveWays (id, way, callback) {
	database.hasAWay(id, callback, function () {
		var bounds = getWayBounds(way.nodes);
		database.saveWay(id, bincode.encode(way.nodes, 2), way.tags, bounds, way.nodeIds, callback);
	});
}

function loadWays (nodes, data, ways, callback) {
	async.thread(2).forEach(nodes, function (item, callback) {
		if (ways[item])callback();
		else {
			wayManager.loadByID(item, function (way) {
				if (way) {
					ways[item] = way;
					if (way.isNew) {
						saveWays(item, way, callback);
					} else {
						callback();
					}
				}
			});
		}
	}, callback);
}


var file = require('file.js');

function buildRegion (regionId, data, callback) {
	var cntPaths = 0,
		keys = [regionId];
	console.log('saving paths for', regionId);


	async.thread(2).forEach(keys, function (item, callback) {
		//console.log('reg', item, data.regions[item]);
		if (!data.regions[item].outer.length) {
			if (data.regions[item].inner.length) {
				data.regions[item].outer = data.regions[item].inner;
			}
		}
		if (data.regions[item].outer.length) {
			console.log('enter..', item);
			var ways = {};
			loadWays(data.regions[item].outer, data, ways, function () {
				//Уничтожаем системные границы
				for (var i in ways) {
					if (ways[i].tags && ways[i].tags.closure_segment) {
						ways[i].nodes = [];
					}
				}

				var meta = countor.combine(data.regions[item], ways);
				console.log('has', meta.coordinates.length, 'countors');
				if (!meta.coordinates.length) {
					console.error('for', item, data.regions[item].id);
					console.error('error building');
				}
				database.linkPath(data.regions[item].id, meta.ways, callback);
				cntPaths += meta.ways.length;

				//сбрасываем кеш загруженных путей
				console.log('leave');
			});
		} else {
			console.log(item, 'is empty')
			callback();
		}
	}, function () {
		callback();
	}, true);
}

function saveRegions (data, callback) {
	var regions = data.regions,
		keys = Object.keys(regions);

	function build (item, callback) {
		console.log('saving region', item);
		database.saveRegion(regions[item].id, regions[item].tags, function (callback) {
			console.log('building', item, regions[item].id);
			buildRegion(item, data, callback);
		}, callback, conf.forceCountorUpdate);
	}


	async.forEach(keys, build, callback, true);
}

function setRegionBoxes (callback) {
	var math = require("./math.js");

	database.query("DELETE FROM regionBox", [], function () {
		database.query("SELECT r.id as rid,w.minx as minX,w.maxx as maxX,w.miny as minY,w.maxy as maxY,rp.pathId as pathId,rp.order as worder\
		FROM regions as r \
		INNER JOIN regionPaths as rp ON rp.regionId=r.id \
		INNER JOIN ways as w ON w.Id=rp.wayId WHERE r.id=2340711 GROUP BY r.id,w.id ORDER BY r.id,pathId,worder", [], function (err, data) {
			var regionId = 0;
			//WHERE r.id=1949881
			var pathId = 0;
			var way = [];
			var paths = [];
			var executeSet = [];

			function closeRegion () {
				if (!regionId)return;
				if (paths.length > 0 && paths[0].length > 0) {

					var bounds = [];
					for (var i in paths) {
						var bb = math.getBounds(math.getShortestPath(paths[i]));
						bounds.push(bb[0], bb[1]);
						console.log(bb);
					}
					var regionBounds = math.getBounds(math.getShortestPath(bounds));
					console.log(regionBounds);
					executeSet.push({
						regionId: regionId,
						minx: regionBounds[0][0],
						miny: regionBounds[0][1],
						maxx: regionBounds[1][0],
						maxy: regionBounds[1][1]
					});
				} else {
					console.log('empty', regionId);
				}
				way = [];
				paths = [];
				pathId = 0;
			}

			function closePath () {
				paths.push(way);
				way = [];
			}

			for (var i = 0, l = data.length; i < l; ++i) {
				var element = data[i];
				var rid = element.rid;
				if (rid != regionId) {
					closeRegion();
					regionId = rid;
				}
				if (pathId != element.pathId) {
					closePath();
					pathId = element.pathId;
				}
				way.push([element.minX, element.minY]);
				way.push([element.maxX, element.maxY]);
			}
			closePath();
			closeRegion();
			async.thread(-1, 1).forEach(executeSet, function (i, callback) {
				database.query("INSERT INTO regionBox SET ?", i, callback);
			}, callback, true);
		});
	});

}

exports.combine = function (data, callback) {

	saveRegions(data, function () {
		setRegionBoxes(function () {
			callback();
			//database.assignParents(callback);
		});
	});


	return data;
}

exports.getWayBounds = getWayBounds;