var async = require('async.js')
var relationManager = require('./relation.js');
var wayManager = require('./way.js');
var simplification = require('./simplification');
var file = require('file.js');
var postprocess = require("./postprocess.js");
var simplification = require('./simplification.js')

var connection = require("database.js");

connection.init({
    host: 'localhost',
    user: 'root',
    password: '',

    database: 'osme'
});

exports.end = function () {
    connection.close();
}

exports.scan = function (settings, callback) {

    //@see http://wiki.openstreetmap.org/wiki/Tag:boundary%3Dadministrative

    var command = 'rel[boundary=administrative][type=boundary][admin_level~"' + settings.adminLevel + '"]';
    if (settings.country) {
        command += '[\'addr:country\'=\'' + settings.country + '\']';
    }
    console.log('execute ', command);
    var ways=0;
    relationManager.query(command, function (region) {
        return true;
    }, function (regions) {
        console.log('loading ways');
        loadWays(getWays(regions), 0, function (ways) {
            console.log('processing');
            var data = postprocess.combine({
                regions: regions,
                ways: ways
            }, function () {
                console.log('done');
                callback();
            });
        });
    });
}

exports.export = function (query) {
    file.write("../tmp-data/regions.js",
        'var osme = osme||{};osme.regions=' + JSON.stringify(data.regions, null, '    ')
    );
    file.write("../tmp-data/ways.js",
        'var osme = osme||{};osme.ways=' + JSON.stringify(data.ways, null, '    ')
    );
}

function getWays (regions) {
    var ways = {};
    regions.forEach(function (region) {
        if (!region.outer) {
            console.log(region);
        }
        region.outer.forEach(function (wayID) {
            ways[wayID] = true;
        })
        region.inner.forEach(function (wayID) {
            ways[wayID] = true;
        })
    });
    return Object.keys(ways);
}

function loadWays (wayIDs, epsilon, callback) {
    var ways = {};
    console.log(wayIDs.length, ' ways to load');

    async.forEach(
        wayIDs,
        function (id, callback) {
            wayManager.loadByID(
                id,
                epsilon,
                function (way) {
                    ways[id] = way;
                    callback();
                },
                callback
            );
        },
        function () {
            callback(ways);
        }, true
    );
}