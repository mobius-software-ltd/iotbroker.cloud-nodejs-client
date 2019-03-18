/**
 * Mobius Software LTD
 * Copyright 2015-2016, Mobius Software LTD
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */

var Tokens = function Tokens() {
    var tokens = [];
    tokens[0] = 0;

    this.releaseToken = function(token) {
          var i = tokens.indexOf(token);        
          if (i == -1) throw Error('Token not exist!');
         delete tokens[i];
        if (tokens.length - 1 == i)
            tokens.length--;
           
    };

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

        return t;
    };

    this.contains = function(t) {
        return (tokens.indexOf(t) > -1) ? true : false;
    };

    this.updateTokens = function(t) {
        tokens = t;
    };
};
module.exports = Tokens;