var testCenter =
    //[ 54.768800350908805, 168.202265506134 ]
        [ 54.7849396490912, 168.21407749386597 ]
;

var geocode = require("../lib/backgeocode.js").geocode;

geocode(testCenter, {level:3}, function (results) {

    console.log('result:',results);
    console.log('*****END****');
});
