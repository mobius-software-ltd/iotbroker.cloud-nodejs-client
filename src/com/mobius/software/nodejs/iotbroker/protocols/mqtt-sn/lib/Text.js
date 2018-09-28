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

'use strict'

function Text() {
    //reference on the local buffer
    var chars;

    //the start position
    var pos;

    //the length of the string
    var len;

    var hash = -1;

    if (arguments.length == 3) {
        chars = arguments[0];
        pos = arguments[1];
        len = arguments[2];
    } else if (Text.prototype.isPrototypeOf(arguments[0])) {
        chars = arguments[0].chars;
        pos = arguments[0].pos;
        len = arguments[0].len;
    } else if (typeof arguments[0] == 'string') {
        chars = Buffer.from(arguments[0]);
        pos = 0;
        len = arguments[0].length;
    }

    return {

        length: function() {
            return len;
        },
        charAt: function(index) {
            return chars[pos + index];
        },

        split: function(separator) {
            var pointer = pos;
            var limit = pos + len;
            var mark = pointer;
            var tokens = [];

            if (Text.prototype.isPrototypeOf(separator)) {

                if (separator.length() == 0) {
                    tokens.push(new Text(chars, mark, pointer - mark));
                    return tokens;
                }

                var index = 0;
                while (pointer < limit) {
                    if (chars[pointer] == separator.charAt(index))
                        index++;
                    else
                        index = 0;

                    if (index == separator.length()) {
                        tokens.push(new Text(chars, mark, pointer - mark));
                        mark = pointer + 1;
                        index = 0;
                    }

                    pointer++;
                }

                tokens.push(new Text(chars, mark, limit - mark));
                return tokens;

            } else if (!Text.prototype.isPrototypeOf(separator)) {
                while (pointer < limit) {
                    if (chars[pointer] == separator) {
                        tokens.push(new Text(chars, mark, pointer - mark));
                        mark = pointer + 1;
                    }
                    pointer++;
                }

                tokens.push(new Text(chars, mark, limit - mark));
                return tokens;
            }
        },

        equals: function(other) {
            if (other == null || typeof other == 'undefined') {
                return false;
            }

            if (!(Text.prototype.isPrototypeOf(other))) {
                return false;
            }

            var t = other;
            if (len != t.len) {
                return false;
            }

            return compareChars(t.chars, t.pos);
        },
        compareChars: function(tChars, tPos) {
            for (var i = 0; i < len; i++)
                if (chars[i + pos] != tChars[i + pos])
                    return false;

            return true;
        },
        indexOf: function(value) {

            var pointer = pos;
            var limit = pos + len;
            var mark = pointer;
            if (value.length() == 0)
                return 0;
            var index = 0;
            while (pointer < limit) {
                if (chars[pointer] == value.charAt(index))
                    index++;
                else

                {
                    index = 0;
                    mark++;
                    pointer = mark;
                }
                if (index == value.length())
                    return mark;
                pointer++;
            }
            return -1;
        },
        contains: function(c) {
            for (var k = pos; k < len; k++) {
                if (chars[k] == c)
                    return true;
            }
            return false;
        },
        hashCode: function() {
            var hash = 0;

            var str = chars.toString();
            var char;

            if (str.length == 0) return hash;
            for (i = 0; i < str.length; i++) {
                char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return 67 * 7 + hash;

        },

        toString: function() {
            return chars.toString();
        }
    }
}

module.exports = Text;