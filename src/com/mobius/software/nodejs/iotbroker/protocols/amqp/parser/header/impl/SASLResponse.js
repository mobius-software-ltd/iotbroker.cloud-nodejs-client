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

var crypto = require('crypto');

function SASLResponse(code, doff, type, channel, response) {
    this.code = code;
    this.doff = doff;
    this.channel = channel;
    this.type = type;
    this.response = response;
    return {
        getClassName: function() {
            return 'SASLResponse'
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
            if (response == null)
                throw new Error("SASL-Response header's challenge can't be null");
            list.addElement(0, AMQPWrapper.wrap(response));

            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(AMQPType.SMALL_ULONG, Buffer.from(0x43)));
            list.setConstructor(constructor);

            return list;
        },
        fromArgumentsList: function () {
            var size = list.getList().length;

            if (size == 0)
                throw new Error("Received malformed SASL-Response header: challenge can't be null");

            if (size > 1)
                throw new Error("Received malformed SASL-Response header. Invalid number of arguments: " + size);

            if (size > 0) {
                var element = list.getList()[0];
                if (element == null)
                    throw new Error("Received malformed SASL-Response header: challenge can't be null");
                response = AMQPUnwrapper.unwrapBinary(element);
            }
        },
        calcCramMD5: function (challenge, user) {
            if (challenge != null && challenge.length != 0) {
                try {
                    
                    var key = Buffer.from(user, 'md5')
                    var mac = crypto.createHmac('md5', key).update(challenge)

                 
                   var bytes = Buffer.from(mac)
                   var hash = Buffer.from(user)
                    hash.append(' ');
                    for (var i = 0; i < bytes.length; i++) {
                        var hex = parseInt(0xFF & bytes[i], 16);

                        if (hex.length() == 1) {
                            hash.append('0');
                        }
                        hash.append(hex);
                    }
                    return Buffer.from(hash, "ascii");
                } catch (e) {
                    throw new Error("Unable to utilise required encoding", e);
                }
            } else {
                return Buffer.from(0);
            }
        },
        hashCode: function () {
            var prime = 31;
            var result = AMQPHeader.hashCode();

            result = prime * result + response.hashCode();
            return result;
        },
        equals: function (obj) {
            if (this == obj)
                return true;
            if (!AMQPHeader.equals(obj))
                return false;
            var other = obj;

            if (response.length !== other.response.length) {
                return false;
            }
            for (var i = 0, l = response.length; i < l; i++) {
                if (response[i] instanceof Array && other.response[i] instanceof Array) {
                    if (response[i] != other.response[i]) {
                        return false;
                    }
                }
                else if (response[i] !== other.response[i]) {
                    return false;
                }
            }

            return true;
        },
        getResponse: function () {
            return response;
        },
        setCramMD5Response(challenge,user) {
		if (user == null)
			throw new Error("CramMD5 response generator must be provided with a non-null username value");
		if (challenge == null)
			throw new Error("CramMD5 response generator must be provided with a non-null challenge value");
		this.response = crypto.createHash('md5').update(challenge.toString() + user).digest('hex');
	}
    }
}
module.exports = SASLResponse;
