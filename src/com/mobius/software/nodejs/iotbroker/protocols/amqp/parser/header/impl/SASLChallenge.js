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

'use strict';

var AMQPType = require('../../avps/AMQPType');
var DescribedConstructor = require('../../constructor/DescribedConstructor');
var AMQPHeader = require('../../header/api/AMQPHeader');
var AMQPUnwrapper = require('../../header/api/AMQPUnwrapper');
var AMQPWrapper = require('../../header/api/AMQPWrapper');
var TLVAmqp = require('../../tlv/api/TLVAmqp');
var TLVFixed = require('../../tlv/impl/TLVFixed');
var TLVList = require('../../tlv/impl/TLVList');

function SASLChallenge(code, doff, type, channel, challenge) {
    this.code = code;
    this.doff = doff;
    this.channel = channel;
    this.type = type;
    this.challenge = challenge;
    return {
        getClassName: function() {
            return 'SASLChallenge'
        }, 
        getCode: function() {
            return this.code;
        },
        getDoff: function () {
            return doff;
        },
        setDoff: function (newDoff) {
            this.doff = newDoff;
        },
        getType: function () {
            return type;
        },
        setType: function (newType) {
            this.type = newType;
        },
        getChannel: function () {
            return channel;
        },
        setChannel: function (newChannel) {
            this.channel = newChannel;
        },
        toArgumentsList: function () {
            var list = new TLVList();

            if (challenge == null)
                throw new Error("SASL-Challenge header's challenge can't be null");
            list.addElement(0, AMQPWrapper.wrap(challenge));

            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(AMQPType.SMALL_ULONG, Buffer.from(0x42)));
            list.setConstructor(constructor);

            return list;
        },
        fromArgumentsList: function (list) {
            var size = list.getList().length;

            if (size == 0)
                throw new Error("Received malformed SASL-Challenge header: challenge can't be null");

            if (size > 1)
                throw new Error("Received malformed SASL-Challenge header. Invalid number of arguments: " + size);

            if (size > 0) {
                var element = list.getList()[0];
                if (element == null)
                    throw new Error("Received malformed SASL-Challenge header: challenge can't be null");
                challenge = AMQPUnwrapper.unwrapBinary(element);
            }
        },
        hashCode: function () {
            var prime = 31;
            var result = AMQPHeader.hashCode();
            //result = prime * result + Arrays.hashCode(challenge);
            return result;
        },
        equals: function (obj) {
            if (this == obj)
                return true;
            if (!AMQPHeader.equals(obj))
                return false;
            // if (getClass() != obj.getClass())
            //     return false;
            var other = obj;
            // if (!Arrays.equals(challenge, other.challenge))
            //     return false;
            if (!other.challenge) {
                return false;
            }
            if (this.length !== other.challenge.length) {
                return false;
            }
            for (var i = 0, l = this.length; i < l; i++) {
                if (this[i] instanceof Array && other.challenge[i] instanceof Array) {
                    if (this[i] != other.challenge[i]) {
                        return false;
                    }
                }
                else if (this[i] !== other.challenge[i]) {
                    return false;
                }
            }
            return true;
        },
        getChallenge: function () {
            return challenge;
        },
        setChallenge: function(challenge) {
            this.challenge = challenge;
        }
    }
}
module.exports = SASLChallenge;