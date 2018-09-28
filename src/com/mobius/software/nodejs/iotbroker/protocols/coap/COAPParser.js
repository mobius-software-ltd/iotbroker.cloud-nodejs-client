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

var ENUM = require('./lib/enum');
var COAPmessage = require('./lib/message');

var COAPParser = {
    decode: decode,
    encode: encode
}



function decode(buf) {
    try {

        var index = 0;
        var message = COAPmessage();

        var firstByte = buf.readUInt8(index);
        index += 1;
        var version = firstByte >> 6;
        if (version != 1) {
            throw new Error("COAP: Invalid version: " + version);
        }
        message.setVersion(version);
        var typeValue = (firstByte >> 4) & 3;
        message.setType(typeValue);
        var tokenLength = firstByte & 0xf;

        if (tokenLength > 8) {
            throw new Error("COAP: Invalid token length: " + tokenLength);
        }

        var codeByte = buf.readUInt8(index);
        index += 1;

        var codeValue = (codeByte >> 5) * 100;
        codeValue += codeByte & 0x1F;

        message.setCode(codeValue);
        message.setMessageID(buf.readUInt16BE(index));

        if (tokenLength > 0) {
            var tokenBytes = Buffer.alloc(tokenLength, buf.readUInt16BE(index));

            index += 2;
            var start = index;
            var end = index + tokenBytes.length;
            var token = buf.slice(start, end);           
            index = end;
            message.setToken(parseInt(token))
        }

        var number = 0;
        while (buf.length > 0) {
            var nextByte = buf.readUInt8(index);
            index += 1;
            if (nextByte == 0xFF) {
                break;
            }

            var delta = (nextByte >> 4) & 15;
            if (delta == 13) {
                delta = buf.readUInt8(index) + 13;
                index += 1;
            } else if (delta == 14) {
                delta = buf.readUInt16BE(index) + 269;
                index += 2;
            } else if (delta > 14) {
                throw new Error("COAP: Invalid option delta value: " + delta);
            }

            number += delta;
            var optionLength = nextByte & 15;
            if (optionLength == 13) {
                optionLength = buf.readUInt8(index) + 13;
                index += 1;
            } else if (optionLength == 14) {
                optionLength = buf.readUInt16BE(index) + 269;
                index += 2;
            } else if (optionLength > 14) {
                throw new Error("COAP: Invalid option delta value: " + optionLength);
            }
            if (optionLength > 0) {               
                var optionBytes = Buffer.alloc(optionLength, buf.readUInt16BE(index));
              
               
                var start = index;
                var end = index + optionBytes.length;
                var optionValue = buf.slice(start, end);
               
                index = end;
                if(number == 6) {
                    optionValue = optionValue.readUInt16BE(2).toString();                  
                         } 
                
            }
            if (optionValue != undefined)
                message.addOption(number, optionValue)
        }


        if (buf.length - index > 0) {
            //var size = buf.length - index;
            if (buf.length - index > 1) {
            var payloadBytes = Buffer.alloc(buf.readUInt16BE(index))
            } else {
                var payloadBytes = Buffer.alloc(buf.readUInt8(index))
            }

            // index += 2;
            var start = index;
            var end = index + payloadBytes.length;
            var payload = buf.slice(start, end);
            index = end;
            message.setPayload(payload)
        }

        return message;
    } catch (e) {
        console.log('Unable to dencode message. Error: ', e);
    }

}

function encode(message) {   
    var index = 0;
    var length = message.getLength();
    var buf = Buffer.alloc(length);
    if (message.getToken()) {
        try {
            var token = message.getToken().toString()          
           // var tokenLength = token.length;  
            var tokenLength = Buffer.from(token, 'hex').toString('utf8').length;
             var tokenBuf = Buffer.alloc(tokenLength);
            var totalLength = buf.length + tokenBuf.length
            buf = Buffer.concat([buf, tokenBuf], totalLength);
        } catch (e) {
            console.log('Unable to encode token. Error: ', e);
        }
    }
    var options = message.getOptions();

    var firstByte = 0;
    firstByte += message.getVersion() << 6;
    firstByte += message.getType() << 4;
    if (message.getToken()) {
       firstByte += Buffer.from(token, 'hex').toString('utf8').length;
    }
    index = buf.writeUInt8(firstByte, index);
    if (message.getCode()) {
        var codeMsb = message.getCode() / 100;
        var codeLsb = message.getCode() % 100;
        var codeByte = (codeMsb << 5) + codeLsb;
        index = buf.writeUInt8(codeByte, index);
    }
    index = buf.writeUInt16BE(message.getMessageID(), index);
    if (message.getToken()) {
       index += buf.write( Buffer.from(message.getToken(), 'hex').toString('utf8'), index);
    }

    var previousNumber = 0;
    try {
        if (options.length)
            for (var i = 0; i < options.length; i++) {

                var option = options[i];
                var delta = option.getNumber() - previousNumber;
               
                var nextByte = 0;
                var extendedDelta = null;
                if (delta < 13) {
                    nextByte += delta << 4;
                } else {
                    extendedDelta = delta;
                    if (delta < 0xFF) {
                        nextByte = 13 << 4;
                    } else {
                        nextByte = 14 << 4;
                    }
                }
                var extendedLength = null;
                if (option.getLength() < 13) {                     
                        nextByte += option.getLength();                    
                } else {
                    extendedLength = option.getLength();
                    if (option.getLength() < 0xFF) {
                        nextByte += 13;
                    } else {
                        nextByte += 14;
                    }
                }
 
                if (nextByte) {                                   
                    var nextBuf = Buffer.alloc(1);
                    var totalLength = buf.length + nextBuf.length
                    var newIndex = nextBuf.writeUInt8(nextByte);
                    buf = Buffer.concat([buf, nextBuf], totalLength);
                    index += newIndex;                  
                }

           
                if (extendedDelta) {
                    if (extendedDelta < 0xFF) {   
                        var nextBuf = Buffer.alloc(1);
                        var totalLength = buf.length + nextBuf.length;
                        var newIndex = nextBuf.writeUInt8(extendedDelta - 13);
                        buf = Buffer.concat([buf, nextBuf], totalLength);
                        index += newIndex;                         
                    } else {
                        var nextBuf = Buffer.alloc(2);
                        var totalLength = buf.length + nextBuf.length;
                        var newIndex = nextBuf.writeUInt16BE(extendedDelta - 269);
                        buf = Buffer.concat([buf, nextBuf], totalLength);
                        index += newIndex;
                    }
                }

                if (extendedLength) {
                    if (extendedLength < 0xFF) {                       
                        var nextBuf = Buffer.alloc(1);
                        var totalLength = buf.length + nextBuf.length;
                        var newIndex = nextBuf.writeUInt8(extendedLength - 13);
                        buf = Buffer.concat([buf, nextBuf], totalLength);
                        index += newIndex;                        
                    } else {
                        var nextBuf = Buffer.alloc(2);
                        var totalLength = buf.length + nextBuf.length;
                        var newIndex = nextBuf.writeUInt16BE(extendedLength - 269);
                        buf = Buffer.concat([buf, nextBuf], totalLength);
                        index += newIndex;
                    }
                }
               

                var nextBuf = Buffer.alloc(option.getValue().length);
                var totalLength = buf.length + nextBuf.length;               
                index += nextBuf.write(option.getValue());                
                buf = Buffer.concat([buf, nextBuf], totalLength);
                previousNumber = option.getNumber();
               // }
            }  
             
    } catch (e) {
        console.log('Unable to encode option. Error: ', e);
    }
    var nextBuf = Buffer.alloc(1);
    var totalLength = buf.length + nextBuf.length;
    var newIndex = nextBuf.writeUInt8(0xFF);
    buf = Buffer.concat([buf, nextBuf], totalLength);
    index += newIndex;

    if (message.getPayload() && message.getPayload().length > 0) {
        // index += buf.write(message.getPayload(), index);
        var nextBuf = Buffer.alloc(message.getPayload().length);
        var totalLength = buf.length + nextBuf.length;
        index += nextBuf.write(message.getPayload());
        buf = Buffer.concat([buf, nextBuf], totalLength);
    }
    return buf;

}

module.exports = COAPParser;