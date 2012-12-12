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

function getShiftsStrip (path, codingCoefficient) {
    var res = [];
    for (var i = 0, l = path.length, prev = 0; i < l; i++) {
        res.push(Math.round((path[i] - prev) * codingCoefficient));
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

function getDeltaStrip (shifts) {
    var deltaMax = 0;
    for (var i = 1, l = shifts.length; i < l; ++i) {
        deltaMax = Math.max(deltaMax, shifts[i]);
    }
    return deltaMax;
}

function encodeNbytes (x, N) {
    var chr = [];
    for (var i = 0; i < N; i++) {
        chr[i] = x & 0x000000ff;
        x = x >> 8;
    }
    return chr;
}


function decodeNbytes (x, N) {
    var point = 0;
    for (var i = 0; i < N; ++i) {
        point |= (x.charCodeAt(i) << (i * 8));
    }
}

function encodePath (path) {
    var shifts = getShiftsPoint(path, codingCoefficient),
        delta = getDeltaPoint(shifts),
        bits = [
            Math.ceil(Math.log(delta[0]) / Math.log(256)),
            Math.ceil(Math.log(delta[1]) / Math.log(256))
        ],
        result = [];

    //на время тестов - простой вариант
    bits = [4, 4];

    //начало всегда 4хбайтное
    result = result.concat(
        encodeNbytes(shifts[0][0], 4),
        encodeNbytes(shifts[0][1], 4)
    );
    //Алгоритм отличается от стандартного варианта YMaps переменным значением основания
    for (var i = 1, l = shifts.length; i < l; i++) {
        result = result.concat(
            encodeNbytes(shifts[i][0], bits[0]),
            encodeNbytes(shifts[i][1], bits[1])
        );
    }
    return ((bits[0] << 4) | bits[1]) + base64.to(result);
}


function encodeStrip (path) {
    var shifts = getShiftsStrip(path, 1),
        delta = getDeltaStrip(shifts),
        bits = Math.ceil(Math.log(delta[0]) / Math.log(256)),
        result = [];

    //на время тестов - простой вариант
    bits = 4;
    //начало всегда 4хбайтное
    result.push(encodeNbytes(shifts[0], 4));
    //Алгоритм отличается от стандартного варианта YMaps переменным значением основания
    for (var i = 1, l = shifts.length; i < l; i++) {
        result.push(encodeNbytes(shifts[i], bits));
    }
    return (bits) + base64.to(result);
}


function decodePath (encodedCoordinates) {
    var bitsSet = encodedCoordinates.charAt(0);
    var byteVector = base64.from(encodedCoordinates.substr(1)),
        byteVectorLength = byteVector.length,
        index = 0,
        prev = [0, 0],
        result = [];

    while (index < byteVectorLength) {
        var x = byteVector.substr(index, 4),
            y = byteVector.substr(index + 4, 4),
            pointx = decodeNbytes(x, bitsSet[0]),
            pointy = decodeNbytes(y, bitsSet[0]);

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
        return encodeStrip(path);
    } else {
        return encodePath(path);
    }
}

exports.decode = function (string, components) {
    if (components == 1) {
        return decodeStrip(string);
    } else {
        return decodePath(string);
    }
}