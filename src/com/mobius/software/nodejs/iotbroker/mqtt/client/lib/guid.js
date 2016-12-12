'use strict';

function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

var type = {
    16: function() {
        return s4() + s4() + s4() + s4();
    },

    32: function() {
        return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
    }
};

module.exports = function(length) {
    return type[length || 32]();
};