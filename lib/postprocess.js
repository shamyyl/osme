var bincode = require("./binaryCode.js");
var database = require("database");
var countor = require("./countor.js");
var async = require("async.js");

function getWayBounds (nodes) {
    var min = nodes[0].slice(0),
        max = nodes[0].slice(0);

    for (var i = 1, l = nodes.length; i < l; i++) {
        min[0] = Math.min(min[0], nodes[i][0]);
        min[1] = Math.min(min[1], nodes[i][1]);
        max[0] = Math.max(max[0], nodes[i][0]);
        max[1] = Math.max(max[1], nodes[i][1]);
    }
    return [min, max];
}

function saveWays (ways, callback) {
    var cntWays = 0,
        keys = Object.keys(ways);
    console.log('saving ways');
    async.forEach(keys, function (item, callback) {
        cntWays++;
        var bounds = getWayBounds(ways[item].nodes);
        database.saveWay(item, bincode.encode(ways[item].nodes, 2), ways[item].tags, bounds, callback);
    }, function () {
        console.log('saved', cntWays, 'ways');
        callback();
    }, true)
}

function saveRegions (data, callback) {
    var cntRegions = 0,
        regions = data.regions,
        keys = Object.keys(regions);
    console.log('saving regions');
    async.forEach(keys, function (item, callback) {
        cntRegions++;
        database.saveRegion(regions[item].id, regions[item].tags, function () {
            buildRegion(item, data);
        }, callback);
    }, function () {
        console.log('saved', cntRegions, 'regions');
        callback();
    }, true);
}

function buildRegion (regionId, data, callback) {

    var cntPaths = 0,
        keys = [regionId];
    console.log('saving paths');
    async.forEach(keys, function (item, callback) {
        var meta = countor.combine(data.regions[item], data.ways),
            ways = meta.ways;
        database.linkPath(data.regions[item].id, ways, callback);
        cntPaths += ways.length;
    }, function () {
        callback();
    }, true);
}

exports.combine = function (data, callback) {

    saveWays(data.ways, function () {
        saveRegions(data, function () {
            //buildRegions(data, function () {
                database.assingParents(callback);
            //});
        })
    });


    return data;
}