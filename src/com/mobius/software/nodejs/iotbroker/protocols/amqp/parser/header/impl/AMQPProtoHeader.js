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

var AMQPHeader = require('../../header/api/AMQPHeader');
var TLVList = require('../../tlv/impl/TLVList');
var ENUM = require('../../../lib/enum')
function AMQPProtoHeader(doff, code, type, channel, protocolId) {   
    var code = ENUM.HeaderCode.PROTO;
    this.doff = doff;
    this.channel = channel;
    this.type = type;
    this.protocolId = protocolId;
    this.protocol = "AMQP"
    this.versionMajor = 1;
    this.versionMinor = 0;
    this.versionRevision = 0;
    return {
        getClassName: function() {
            return 'AMQPProtoHeader'
        },
        getCode: function() {
            return code;
        },        
        getDoff: function () {
            return this.doff;
        },
        setDoff: function (newDoff) {
            this.doff = newDoff;
        },
        getType: function () {
            return this.type;
        },
        setType: function (newType) {
            this.type = newType;
        },
        getChannel: function () {
            return this.channel;
        },
        setChannel: function (newChannel) {
            this.channel = newChannel;
        },
        getProtocol: function () {
            return this.protocol;
        },
        getProtocolId: function () {
            return this.protocolId;
        },
        setProtocolId: function (value) {
           
            this.protocolId = value;
        },
        getVersionMajor: function () {
            return this.versionMajor;
        },
        setVersionMajor: function (value) {
            this.versionMajor = value;
        },
        getVersionMinor: function () {
            return this.versionMinor;
        },
        setVersionMinor: function (value) {
           this.versionMinor = value;
        },
        getVersionRevision: function () {
            return this.versionRevision;
        },
        setVersionRevision: function (newVersionRevision) {
            this.versionRevision = newVersionRevision;
        },
        getBytes: function () {
            var bytes = Buffer.alloc(8);
            var index = 0;
            index = bytes.write(this.protocol);
            index = bytes.write(this.protocolId, index);
            index = bytes.write(this.versionMajor, index);
            index = bytes.write(this.versionMinor, index);
            index = bytes.write(this.versionRevision, index);

            return bytes;
        },
        hashCode: function () {
            var prime = 31;
            var result = AMQPHeader.hashCode();
            result = prime * result + ((protocol == null) ? 0 : protocol.hashCode());
            result = prime * result + protocolId;
            result = prime * result + versionMajor;
            result = prime * result + versionMinor;
            result = prime * result + versionRevision;
            return result;
        },
        equals: function () {
            if (this == obj)
                return true;
            if (!AMQPHeader.equals(obj))
                return false;
            // if (getClass() != obj.getClass())
            // 	return false;
            var other = obj;
            if (protocol == null) {
                if (other.protocol != null)
                    return false;
            }
            else if (protocol != other.protocol)
                return false;
            if (protocolId != other.protocolId)
                return false;
            if (versionMajor != other.versionMajor)
                return false;
            if (versionMinor != other.versionMinor)
                return false;
            if (versionRevision != other.versionRevision)
                return false;
            return true;
        },
        toArgumentsList() {
            return null;
        },
        fromArgumentsList(list) {
        }
    }
}
module.exports = AMQPProtoHeader;