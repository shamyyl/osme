var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=",
    Base64 = {
        baseString: keyStr,

        to: function (input) {
            var inputIsString = typeof input == "string";
            if (typeof btoa != "undefined") {
                if (!inputIsString) {
                    input = String.fromCharCode.apply(String, input);
                }
                return btoa(input).replace(/\//g, '_').replace(/\+/g, '-');
            } else {
                var output = [],
                    chr1, chr2, chr3, enc1, enc2, enc3, enc4,
                    i = 0,
                    l = input.length;

                while (i < l) {

                    if (inputIsString) {
                        chr1 = input.charCodeAt(i++);
                        chr2 = input.charCodeAt(i++);
                        chr3 = input.charCodeAt(i++);
                    } else {
                        chr1 = input[i++];
                        chr2 = input[i++];
                        chr3 = input[i++];
                    }

                    enc1 = chr1 >> 2;
                    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                    enc4 = chr3 & 63;

                    if (isNaN(chr2)) {
                        enc3 = enc4 = 64;
                    } else if (isNaN(chr3)) {
                        enc4 = 64;
                    }


                    output.push(keyStr.charAt(enc1), keyStr.charAt(enc2), keyStr.charAt(enc3), keyStr.charAt(enc4));

                }
                return output.join("");
            }

        },

        from: function (input) {
            if (typeof atob != "undefined") {
                return atob(input.replace(/_/g, '/').replace(/-/g, '+'));
            } else {
                var output = [],
                    chr1, chr2, chr3,
                    enc1, enc2, enc3, enc4,
                    i = 0,
                    l = (input = input.replace(/[^A-Za-z0-9\-_\=]/g, "")).length;

                while (i < l) {

                    enc1 = keyStr.indexOf(input.charAt(i++));
                    enc2 = keyStr.indexOf(input.charAt(i++));
                    enc3 = keyStr.indexOf(input.charAt(i++));
                    enc4 = keyStr.indexOf(input.charAt(i++));

                    chr1 = (enc1 << 2) | (enc2 >> 4);
                    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                    chr3 = ((enc3 & 3) << 6) | enc4;

                    output.push(String.fromCharCode(chr1));

                    if (enc3 != 64) {
                        output.push(String.fromCharCode(chr2));
                    }
                    if (enc4 != 64) {
                        output.push(String.fromCharCode(chr3));
                    }

                }

                return output.join("");
            }
        }
    };

exports.to = Base64.to;
exports.from = Base64.from;
