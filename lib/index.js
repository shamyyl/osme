var async = require('async.js')
var relationManager = require('./relation.js');
var wayManager = require('./way.js');
var simplification = require('./simplification');
var file = require('file.js');
var postprocess = require("./postprocess.js");
var simplification = require('./simplification.js')

exports.scan = function (settings, callback) {

    //@see http://wiki.openstreetmap.org/wiki/Tag:boundary%3Dadministrative

    var command = 'rel[boundary=administrative][admin_level~"' + settings.adminLevel + '"]';
    if (settings.country) {

        //Вариант2
        //command += '[\'cladr:code\']';
        //Вариант 3
        //command += '[\'oktmo:user\']';
        //Вариант 4
        //command+='[alt_name~\'район\']';

        //Адреса по россии
        //command += '[\'addr:country\'=\'' + settings.country + '\']';
        //Все остальные страны
        command += '[\'ISO3166-1\'=\'' + settings.country + '\']';

    }

	var radius=1,
	    aroundPoint = [55.38317010942621, 37.57598876953128],
		bbox = [aroundPoint[0]-radius,aroundPoint[1]-radius,aroundPoint[0]+radius,aroundPoint[1]+radius];
	//command+='('+bbox.join(',')+')';

    //command+='(1020366)';//quba
    //command+='(36990)';//monaco
	//command+='(393980)';
	//command+='(176095)';
	//command+='(1118829)'
	//command+='(939223)';

    console.log('execute ', command);

    relationManager.query(command, function (region) {
        return true;
    }, function (regions) {
        var usedWays = getWays(regions);
        postprocess.combine({
            regions: regions,
            usedWays: usedWays
        }, function () {
            console.log('done');
            callback();
        });
    });
}

exports.export = function (query, callback) {
    console.log(query);
    require("./export.js").process(query, callback);
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