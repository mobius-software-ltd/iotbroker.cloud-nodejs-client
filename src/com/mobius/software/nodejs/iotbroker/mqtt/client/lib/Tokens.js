// 'use strict'

var Tokens = function Tokens() {
    var tokens = [];
    tokens[0] = 0;

    this.releaseToken = function(token) {
        var i = tokens.indexOf(token);
        if (i == -1) throw Error('Token not exist!')
        delete tokens[i];
        console.log('tokens:', tokens);
        if (tokens.length - 1 == i)
            tokens.length--;
    }

    this.getToken = function() {
        var t = tokens.length;
        if (t >= 65535) {
            for (var i = 1; i < tokens.length; i++) {
                if (typeof tokens[i] == 'undefined') {
                    t = i + 1;
                    (function(t) {
                        tokens[t] = t;
                    })(t);
                    break;
                }
            }
            if (t >= 65535)
                throw Error('No free tokens left!');
        } else {
            tokens[t] = t;
        }

        console.log('tokens:', tokens);
        //     var t = Math.floor(Math.random() * 65535);

        // while (tokens.indexOf(t) > -1) {
        //     t = Math.floor(Math.random() * 65535);
        // }
        // tokens.push(t);
        return t;
    }

    this.contains = function(t) {
        return (tokens.indexOf(t) > -1) ? true : false;
    }

    if (Tokens.caller != Tokens.getInstance) {
        throw new Error("This object cannot be instanciated");
    }
}
Tokens.instance = null;

Tokens.getInstance = function() {
    if (this.instance === null) {
        this.instance = new Tokens();
    }
    return this.instance;
}

module.exports = Tokens.getInstance();