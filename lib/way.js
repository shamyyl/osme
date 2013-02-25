var cachedHttp = require('cachedHttp.js');
var simplification = require('./simplification.js')
var database = require("./database.js");
var bincode = require("./binaryCode.js");
var conf=require("./config.js");

exports.loadByID = function (id, callback, errorCallback) {
    if (1) {
        database.hasAWay(id, function (result) {
            var way = {};
            way.nodes = bincode.decode(result.coordinates, 2);
            way.id = id;
            way.firstNode=result.firstNode;
            way.lastNode=result.lastNode;
            try {
                way.tags = result.tags ? JSON.parse(result.tags) : {};
            } catch (e) {
                console.error(result);
                console.error(e);

                throw e;
            }
            callback(way);
        }, function () {
            loadFromCache(id, callback, errorCallback);
        }, true);
    } else {
        loadFromCache(id, callback, errorCallback);
    }
}

function loadFromCache (id, callback, errorCallback) {
    cachedHttp.load(
        conf.overpass,
        '/api/interpreter?data=[out:json];(way(' + id + ');>);out;',
        function (responseText) {
            var responseJSON = JSON.parse(responseText);
            if (responseJSON.elements && responseJSON.elements.length) {
                var way = createFromJSON(responseJSON);
                way.isNew = 1;
                callback(way);
                return true;
            } else {
                console.log('wrong data for way@' + id);
                callback({
                    id:id,
                    nodeIds:[],
                    nodes:[]
                });//errorCallback();
                return false;
            }
        },
        'way'
    );
}

function createFromJSON (relationJSON) {
    var way;
    var nodes = {};
    relationJSON.elements.forEach(function (element) {
        if (element.type === 'node') {
            nodes[element.id] = [element.lat, element.lon];
        } else if (element.type === 'way') {
            way = element;
        }
    });

    if(!way){
        return false;
    }
    way.firstNode=way.nodes[0];
    way.lastNode=way.nodes[way.nodes.length-1];
    way.nodeIds = way.nodes.slice(0)
    way.nodes.forEach(function (nodeID, index) {
        way.nodes[index] = nodes[nodeID];
    });

    return way;
}