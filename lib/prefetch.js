var fs = require('fs');
var bincode = require("./binaryCode.js");
var database = require("./database.js");
var conf=require("./config.js");

var getWayBounds = require("./postprocess.js").getWayBounds;
var async = require("async.js");

function scanElement (data, start, fn) {
    while (1) {
        var first = data.indexOf('{', start);
        if (first <= 0) {
            break;
        }
        var carret = first + 1;
        var end = data.indexOf('}', carret);
        if (end <= 0) {
            break;
        }
        var next = data.indexOf('{', carret);
        carret = end + 1;
        var cntPass = 0;
        while (end > next && next > 0) {
            cntPass++;
            next = data.indexOf('{', carret);
            end = data.indexOf('}', carret);
            if (end <= 0) {
                break;
            }
            carret = end + 1;
        }
        if (end <= 0) {
            break;
        }
        var object = data.substr(first, end - first + 1);
        start = end;
        try {
            fn(object);
        } catch (e) {
            console.error(object);
            //throw new Error(e, 'erer', object);
        }
    }
    return start;
}

function load (fileName, scope, fn) {
    var stat = fs.statSync(fileName);
    console.log('loading ', fileName, ', ', stat.size, ' bytes');


    var fd = fs.openSync(fileName, 'r');
    var L = 8*1024*1024;

    var resBuffer = new Buffer(L*3);


    var dl = fs.readSync(fd, resBuffer, 0, L, 0);
    var data = resBuffer.toString('utf-8',0,dl);
    var start = data.indexOf('[') + 1;

    var callback = function (data) {
        //console.log('in', data);
        fn(scope, JSON.parse(data));
    }

    var carret = start;
    while (1) {
        var readed = scanElement(data, carret, callback);
        carret = 0;

        var oldDataLen = Buffer.byteLength(data, 'utf-8');
        if(readed>0){
            data = data.substr(readed);
           // console.log("now>>",data);
        }else{
            console.log(data);
        }

        var newDataLen = Buffer.byteLength(data, 'utf-8');
        var deltaSize=oldDataLen-newDataLen;

        var tmpBuffer = new Buffer(L*3);
        resBuffer.copy(tmpBuffer, 0, deltaSize );

        var dr = fs.readSync(fd, resBuffer, 0, L, dl);
        if (dr < 1) {
            break;
        }

        resBuffer.copy(tmpBuffer, newDataLen);

        data = tmpBuffer.toString('utf-8',0,newDataLen+dr);

        resBuffer=tmpBuffer;
        dl += dr;
    }


}

function loadWay (scope, element) {
    element.id += 0;
    var type = element.type,
        id = element.id;
    scope[type][id] = element;
    scope['cnt_' + type]++;
}

function loadNode (scope, element) {
    scope.nodes[element.id] = [element.lat, element.lon];
    scope.cnt_node++;
}

exports.load = function (fileName, callback) {

    var data = {
        way: {},
        node: {},

        cnt_way: 0,
        cnt_node: 0,

        nodes: {},
        ways: {}
    };
    var location = "../tmp-data/prefetch/" + fileName;
    load(location, data, loadWay);
    load(location + ".data", data, loadNode);

    console.log('with ', data.cnt_way, 'ways and ', data.cnt_node, ' nodes');


    var waykeys = Object.keys(data.way);
    console.log('starting...');
    //return;

    async.forEach(waykeys, function (item, callback) {
        var nodes = [],
            way = data.way[item];

        database.hasAWay(way.id, callback, function () {

            var nodeError = 0;
            way.nodes.forEach(function (nodeID, index) {
                var node = data.nodes[nodeID];
                //иногда ноды нет (битвы правок)
                if (node) {
                    nodes[index] = node;
                } else {
                    nodeError = 1;
                }
            });
            if (nodeError) {
                console.log('way contain wrong data');
                callback();
                return;
            }
            var bounds = getWayBounds(nodes);
            database.saveWay(way.id, bincode.encode(nodes, 2), way.tags, bounds, way.nodes, callback);
        });
    }, function () {
        console.log('saved');
        callback();
    }, true);


}

