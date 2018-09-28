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
var ENUM = require('../lib/enum');

function SNwillmsgupd(_content) {
    var content = _content;
    return {
        reInit: function(_content) {
            content = _content;
            return this;
        },
        getLength: function() {  
            var length = 2;
            length += content.length;
            if(content.length > 253) {
                length += 2
            }          
            return length;
        },
        getType: function() {
            return ENUM.MessageType.SN_WILLMSGUPD;
        },
        processBy: function(device) {
            device.processUnsuback(this.getPacketID());
        },
        getContent: function() {
            return content;
        },
        setContent: function(value) {
            content = value;
        },
       
    }
}

module.exports = SNwillmsgupd;