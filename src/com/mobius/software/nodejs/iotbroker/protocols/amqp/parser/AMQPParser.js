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

// import com.mobius.software.amqp.parser.avps.HeaderCode;
// import com.mobius.software.amqp.parser.avps.SectionCode;
// import com.mobius.software.amqp.parser.exception.Error;
// import com.mobius.software.amqp.parser.header.api.AMQPHeader;
// import com.mobius.software.amqp.parser.header.api.HeaderFactory;
// import com.mobius.software.amqp.parser.header.impl.AMQPPing;
// import com.mobius.software.amqp.parser.header.impl.AMQPProtoHeader;
// import com.mobius.software.amqp.parser.header.impl.AMQPTransfer;
// import com.mobius.software.amqp.parser.sections.AMQPSection;
// import com.mobius.software.amqp.parser.tlv.impl.TLVList;


var HeaderCode = require('./avps/HeaderCode');
var SectionCode = require('./avps/SectionCode');
var AMQPHeader = require('./header/api/AMQPHeader');
var HeaderFactory = require('./header/api/HeaderFactory');
var AMQPPing = require('./header/impl/AMQPPing');
var AMQPProtoHeader = require('./header/impl/AMQPProtoHeader');
var AMQPTransfer = require('./header/impl/AMQPTransfer');
var TLVList = require('./tlv/impl/TLVList');
var ENUM = require('../lib/enum')
var AMQPParser = {
    next: next,
    decode: decode,
    encode: encode
}


function next(buf) {
    var index = 0
    var length = buf.readUInt32BE(index) & 0xffffffff;
    index += 4;
    if (length == 1095586128) {
        var protocolId = buf.readUInt8(index);
        index++
        var versionMajor = buf.readUInt8(index);
        index++
        var versionMinor = buf.readUInt8(index);
        index++
        var versionRevision = buf.readUInt8(index);
        index++
        if ((protocolId == 0 || protocolId == 3) && versionMajor == 1 && versionMinor == 0 && versionRevision == 0) {
            index = 0;
            return buf.slice(0, 8)//Buffer.allocUnsafeSlow(8);
        }
    }
    index = 0;
    return buf//Buffer.allocUnsafeSlow(length);
};

function decode(buf) {
    var index = 0
    var length = buf.readUInt32BE(index) & 0xffffffff; // & 0xffffffffL;   
    index += 4;
    var doff = buf.readUInt8(index) & 0xff;
    index++;
    var type = buf.readUInt8(index) & 0xff;
    index++;
    var channel = buf.readUInt16BE(index) & 0xffff;
    index += 2;

    // TODO check condition
    if (length == 8 && doff == 2 && (type == 0 || type == 1) && channel == 0) {
        if (buf.length - index == 0){
            return new AMQPPing();
        }            
        else
            throw new Error("Received malformed ping-header with invalid length");
    }
      
    // PTOROCOL-HEADER
    try {
        if (length == 1095586128 && (doff == 3 || doff == 0) && type == 1 && channel == 0)  {           
            if (buf.length - index == 0) {       
                var proto = new AMQPProtoHeader(doff);             
                var protocolId = buf.readUInt8(4)               
                proto.setProtocolId(protocolId)    
                proto.setChannel(channel) 
                return proto
            }            
            else
                throw new Error("Received malformed protocol-header with invalid length");
        } 
    } catch (e) {
        console.log(e)
    }
    
       

    // if (length != buf.length - index + 8)
    //     throw new Error("Received malformed header with invalid length");

      
    var header = null;
    
    if (type == 0) {        
        header = HeaderFactory.getAMQP(buf, index).header;
        index = HeaderFactory.getAMQP(buf, index).index.i
    } else if (type == 1) {        
        header = HeaderFactory.getSASL(buf, index).header;
        index = HeaderFactory.getSASL(buf, index).index.i
    } else {
        throw new Error("Received malformed header with invalid type: " + type);
    }

    try {
        header.setDoff(doff);
        header.setType(type);
        header.setChannel(channel);
    } catch (e) {
        console.log(e)
    }

    try {    
        if (header.getCode() == ENUM.HeaderCode.TRANSFER) {
            var transfer = header;
            var map = new Map();
            transfer.setSections(map);
            while (buf.length - index > 0) {
                var section = HeaderFactory.getSection(buf, index).section;               
                      index = HeaderFactory.getSection(buf, index).index;
                transfer.getSections().set(section.getCode(), section);
            }
        }
    } catch (e) {
        console.log(e)
    }

    return header;
};
function encode(header) {   
    var buf = null;
    var index = 0

    if (header.getClassName() == 'AMQPProtoHeader') {
        buf = Buffer.allocUnsafeSlow(8);
        index += buf.write("AMQP", index);
        index = buf.writeUInt8(header.getProtocolId(), index);
        index = buf.writeUInt8(header.getVersionMajor(), index);
        index = buf.writeUInt8(header.getVersionMinor(), index);
        index = buf.writeUInt8(header.getVersionRevision(), index);
        return buf;
    }

    if (header.getClassName() == 'AMQPPing') {
        buf = Buffer.alloc(8);
        var index = 0
        index = buf.writeUInt32BE(8);
        index = buf.writeUInt8(header.getDoff(), index);
        index = buf.writeUInt8(header.getType(), index);
        index = buf.writeUInt16BE(header.getChannel(), index);
        return buf;
    }

    var length = 8;
    var lengthArgs = 0
    var lengthSections = 0;
    var args = header.toArgumentsList();
    if (args) {
       
        lengthArgs = args.getLength();
    }
       
       
    var sections = null;
    if (header.getCode() == ENUM.HeaderCode.TRANSFER) {
        sections = header.getSections();       
        for (var prop in sections) {     
            lengthSections += sections[prop].getLength();  
        }

    }   
    var totalLength = length + lengthArgs + lengthSections;
    buf = Buffer.alloc(length);
  
    index = buf.writeUInt32BE(totalLength, index);
 
    var doff = header.getDoff();
  
  
    index = buf.writeUInt8(doff, index);
    var type = header.getType();
  
    index = buf.writeUInt8(type, index);
    var channel = header.getChannel();   

    index = buf.writeUInt16BE(channel, index);
    var argsBytes = args.getBytes();
   // index += buf.write(args.getBytes().toString(), index);
   buf = Buffer.concat([buf, argsBytes], buf.length + argsBytes.length);
   index += argsBytes.length;
  
    if (sections != null) {
        // sections.forEach(function (section) {
        //     index += buf.write(section.getValue().getBytes(), index);
        // })
        
        for (var prop in sections) {     
           
            var sectionBytes = sections[prop].getValue().getBytes();
           // index += buf.write(sections[prop].getValue().getValue(), index); 
           buf = Buffer.concat([buf, sectionBytes], buf.length + sectionBytes.length);
        }
    }
    return buf;
}

module.exports = AMQPParser;