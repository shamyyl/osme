var cachedHttp = require('cachedHttp.js');

exports.loadByID = function (id, callback, errorCallback) {
    return exports.query('(relation(' + id + ');)', function () {
        return true;
    }, callback, errorCallback);
}

exports.query = function (query, filter, callback, errorCallback) {
    cachedHttp.load(
        'overpass-api.de',
        '/api/interpreter?data=[out:json];' + query + ';out;',
        function (responseText) {
            var responseJSON = JSON.parse(responseText);
            //console.log(responseJSON);
            if (responseJSON.elements && responseJSON.elements.length) {
                var result = [];
                responseJSON.elements.forEach(function (element) {
                    if (filter(element) && element.members) {
                        result.push(exports.createFromJSON(element));
                    }
                });
                callback(result);
                return true;
            } else {
                console.log('wrong data for relation@' + id);
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
    }

    relationJSON.members.forEach(function (memberJSON) {
        if (memberJSON.type === 'way') {
            if (memberJSON.role === 'outer') {
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

    return relation;
}