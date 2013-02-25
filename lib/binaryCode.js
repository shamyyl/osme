var codingCoefficient = 1000000,
    base64 = require('./ybase64.js');

function getShiftsPoint (path, codingCoefficient) {
    var res = [];
    for (var i = 0, l = path.length, prev = [0, 0]; i < l; i++) {
        res.push([
            Math.round((path[i][0] - prev[0]) * codingCoefficient),
            Math.round((path[i][1] - prev[1]) * codingCoefficient)
        ]);
        prev = path[i];
    }
    return res;
}

function getDeltaPoint (shifts) {
    var deltaMax = [0, 0];
    for (var i = 1, l = shifts.length; i < l; ++i) {
        deltaMax[0] = Math.max(deltaMax[0], shifts[i][0]);
        deltaMax[1] = Math.max(deltaMax[1], shifts[i][1]);
    }
    return deltaMax;
}

function encodeNbytes (x) {
    var chr = [];
    for (var i = 0; i < 4; i++) {
        chr[i] = x & 0x000000ff;
        x = x >> 8;
    }
    return chr;
}


function decodeNbytes (x) {
    var point = 0;
    for (var i = 0; i < 4; ++i) {
        point |= (x.charCodeAt(i) << (i * 8));
    }
    return point;
}

function encodePath (path, codingCoefficient) {
    var shifts = getShiftsPoint(path, codingCoefficient),
        delta = getDeltaPoint(shifts),
        result = [];


    result = result.concat(
        encodeNbytes(shifts[0][0]),
        encodeNbytes(shifts[0][1])
    );
    for (var i = 1, l = shifts.length; i < l; i++) {
        result = result.concat(
            encodeNbytes(shifts[i][0]),
            encodeNbytes(shifts[i][1])
        );
    }
    return base64.to(result);
}

function decodePath (encodedCoordinates, codingCoefficient) {
    var byteVector = base64.from(encodedCoordinates),
        byteVectorLength = byteVector.length,
        index = 0,
        prev = [0, 0],
        result = [];

    while (index < byteVectorLength) {
        var x = byteVector.substr(index, 4),
            y = byteVector.substr(index + 4, 4),
            pointx = decodeNbytes(x),
            pointy = decodeNbytes(y);

        var vector = [pointx / codingCoefficient, pointy / codingCoefficient],
            point = [vector[0] + prev[0], vector[1] + prev[1]];
        prev = point;

        result.push(point);
        index += 8;
    }
    return result;
};


exports.encode = function (path, components) {
    if (components == 1) {
        return encodeStrip(path, 1);
    } else {
        return encodePath(path, codingCoefficient);
    }
}

exports.decode = function (string, components) {
    if (components == 1) {
        return decodeStrip(string, 1);
    } else {
        return decodePath(string, codingCoefficient);
    }
}