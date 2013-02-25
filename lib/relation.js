var cachedHttp = require('cachedHttp.js'),
    conf = require("./config.js");

exports.loadByID = function (id, callback, errorCallback) {
    return exports.query('(relation(' + id + ');)', function () {
        return true;
    }, callback, errorCallback);
}

exports.query = function (query, filter, callback, errorCallback) {
    cachedHttp.load(
        conf.overpass,
        '/api/interpreter?data=[out:json];' + query + ';out;',
        function (responseText) {
            var responseJSON = JSON.parse(responseText);
            //console.log(responseJSON);
            if (responseJSON.elements && responseJSON.elements.length) {
                var result = [];
                responseJSON.elements.forEach(function (element) {
                    if (filter(element) && element.members) {
                        var relation = exports.createFromJSON(element);
                        if (relation) {
                            result.push(relation);
                        }
                    }
                });
                callback(result);
                return true;
            } else {
                console.log('wrong data for relation@' + query);
                errorCallback();
                return false;
            }
        },
        'relation'
    );
}

exports.createFromJSON = function (relationJSON) {


    var relation = {
        id: relationJSON.id,
        outer: [],
        inner: [],
        relations: [],
        subareas: []
    };

    if (relationJSON.tags) {
        relation.tags = relationJSON.tags;
        if (relation.tags.type && relation.tags.type == 'multilinestring') {
            console.log(relation.id, ' is multilinestring');
            return false;
        }

        if (relation.tags.type && relation.tags.border_type == 'territorial') {
            console.log(relation.id, ' is territorial');
           // return false;
        }

        if (relation.tags.type && relation.tags.historical == 'yes') {
            console.log(relation.id, ' is historical');
            return false;
        }

    }

    relationJSON.members.forEach(function (memberJSON) {
        if (memberJSON.type === 'way') {
            if (memberJSON.role === 'outer' || memberJSON.role == '') {
                relation.outer.push(memberJSON.ref);
            } else if (memberJSON.role === 'inner') {
                relation.inner.push(memberJSON.ref);
            }
        } else if (memberJSON.type === 'relation') {
            if (memberJSON.role === 'subarea') {
                relation.subareas.push(memberJSON.ref);
            } else {
                relation.relations.push(memberJSON.ref);
            }
        }
    });
    override(relation);

    return relation;
}

function override (rel) {
}