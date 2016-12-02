'use strict'

function LengthDetails(newLength, newSize) {
    var length = newLength || 0;
    var size = newSize || 0;

    return {
        LengthDetails: function(newLength, newSize) {
            length = newLength;
            size = newSize;
        },

        getLength: function() {
            return length;
        },

        getSize: function() {
            return size;
        },

        decode: function(newBuffer) {
            var length = 0;
            var multiplier = 1;
            var bytesUsed = 0;
            var enc = 0;
            var index = newBuffer.index;
            do {
                if (multiplier > 128 * 128 * 128)
                    throw new Error("Method decode(buf) in LengthDetails class throwed error: Encoded length exceeds maximum of 268435455 bytes");

                // if (!buf.isReadable())
                //     return new LengthDetails(0, 0);

                // console.log(bytesUsed);
                enc = newBuffer.buf.readUInt8(index);
                index++;
                length += (enc & 0x7f) * multiplier;
                multiplier *= 128;
                bytesUsed++;
            }
            while ((enc & 0x80) != 0);
            this.LengthDetails(length, bytesUsed);
            return this;
        }
    }
}

module.exports = LengthDetails;