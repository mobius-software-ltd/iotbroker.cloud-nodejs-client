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

        //     Collection < Text > split(Text separator) {
        // },


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
            // if (hash == -1)
            // hash = 67 * 7 + Arrays.hashCode(this.chars);

            // return hash;

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

        /////////////////////////////////////////
        toString: function() {
            // return new String(chars, pos, len).trim();
            return chars.toString();
        }
    }
}

module.exports = Text;