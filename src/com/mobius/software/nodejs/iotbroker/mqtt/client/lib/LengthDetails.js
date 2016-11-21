'use strict'

function LengthDetails() {
    var length;
    var size;

    return {
LengthDetails: function(newLength, newSize) {
            length = newLength;
            size = newSize;
        }, 

        getLength : function () {
            return length;
        },

        getSize: function() {
            return size;
        },

        decode: function(buf){
            var length = 0;
            var multiplier = 1;
            var bytesUsed = 0;
            var enc = 0;
            do {
                if (multiplier > 128 * 128 * 128)
                    throw new Error("Method decode(buf) in LengthDetails class error: Encoded length exceeds maximum of 268435455 bytes");

                // if (!buf.isReadable())
                //     return new LengthDetails(0, 0);

                enc = buf.readByte();
                length += (enc & 0x7f) * multiplier;
                multiplier *= 128;
                bytesUsed++;
            }
            while ((enc & 0x80) != 0);

            return new LengthDetails(length, bytesUsed);
        }
    }
}

module.exports = LengthDetails;