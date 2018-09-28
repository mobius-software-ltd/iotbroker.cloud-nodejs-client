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

var Events = require('events');
var util = require('util');
var net = require('net');

var ENUM = require('./lib/enum');
var COAPmessage = require('./lib/message');
var parser = require('./COAPParser');
var Timer = require('./lib/Timer');
var TIMERS = require('./lib/Timers');

function COAPClient() {
    this.ENUM = ENUM;
    Events.EventEmitter.call(this);
}
util.inherits(COAPClient, Events.EventEmitter);

COAPClient.prototype.Subscribe = subscribe;
COAPClient.prototype.Unsubscribe = unsubscribe;
COAPClient.prototype.Publish = publish;
COAPClient.prototype.onDataRecieved = onDataRecieved;
COAPClient.prototype.Ping = ping;

module.exports = COAPClient;


var Store = function Store() {
    var storage = [];

    function pushMessage(id, message) {
        storage[id] = message;
    }

    function pullMessage(id) {
        var tmp = storage[id];
        delete storage[id];
        return tmp;
    }
    return {
        pullMessage: pullMessage,
        pushMessage: pushMessage
    }
};
var messages = Store();
var subscribtions = Store();
var unsubscribtions = Store();

function ping(id) {      
    var pingreq = COAPmessage(null, ENUM.CoapTypes.COAP_CONFIRMABLE_TYPE, ENUM.CoapCode.COAP_PUT_METHOD, null, null, [], '');
    pingreq.addOption(ENUM.CoapOptionDefinitions.COAP_NODE_ID_OPTION, id)
    var encPing = parser.encode(pingreq);
    this.emit('coappingreq', encPing);  
}

function subscribe(params) {  
    var token = params.token;  
     var topic = params.topics[0].topic;  
     var qos = params.topics[0].qos;    
     var qosBuf = Buffer.alloc(2);
        qosBuf.writeUInt16BE(qos) 
     var obs = Buffer.alloc(4);
         obs.writeUInt16BE('0');  
  
    var subscribe = COAPmessage(null, ENUM.CoapTypes.COAP_CONFIRMABLE_TYPE, ENUM.CoapCode.COAP_GET_METHOD, null, null, [], '');  
     subscribe.setToken(Buffer.from(token.toString(), 'utf8').toString('hex'));  
     subscribe.setMessageID(params.token)
   // subscribe.setToken(params.token);
    subscribe.addOption(ENUM.CoapOptionDefinitions.COAP_OBSERVE_OPTION, obs);    
    subscribe.addOption(ENUM.CoapOptionDefinitions.COAP_URI_PATH_OPTION, topic);
    subscribe.addOption(ENUM.CoapOptionDefinitions.COAP_ACCEPT_OPTION, qosBuf);  
    subscribe.addOption(ENUM.CoapOptionDefinitions.COAP_NODE_ID_OPTION, params.clientID);
    try {
        var encSubscribe = parser.encode(subscribe);
    } catch (e) {
        console.log('Parser can`t encode Subscribe params.');
    }
    subscribtions.pushMessage(params.token, params);
    this.emit('coapsubscribe', encSubscribe, token);
}

function unsubscribe(params) {  
    var topic = params.topic[0].topic;
    var token = params.topic[0].token; 
    var obs1 = Buffer.alloc(2)   
    var obs2 = Buffer.alloc(2);
        obs2.writeUInt16BE('1');  
    var obs = Buffer.concat([obs1, obs2], 4)
    var unsubscribe = COAPmessage(null, ENUM.CoapTypes.COAP_CONFIRMABLE_TYPE, ENUM.CoapCode.COAP_GET_METHOD, null, null, [], '');

    unsubscribe.setToken(Buffer.from(token.toString(), 'utf8').toString('hex')); 
    unsubscribe.setMessageID(token)
    unsubscribe.addOption(ENUM.CoapOptionDefinitions.COAP_OBSERVE_OPTION, obs);
    unsubscribe.addOption(ENUM.CoapOptionDefinitions.COAP_URI_PATH_OPTION, topic);
     unsubscribe.addOption(ENUM.CoapOptionDefinitions.COAP_NODE_ID_OPTION, params.clientID);
     try {
         var encUnsubscribe = parser.encode(unsubscribe);
    } catch (e) {
        console.log('Parser can`t encode Unsubscribe params.');
    }
    // subscribtions.pushMessage(params.token, params);
    this.emit('coapunsubscribe', encUnsubscribe, token);
}

function publish(params) {
   
    var qosBuf = Buffer.alloc(2);
        qosBuf.writeUInt16BE(params.qos)
    var publish = COAPmessage(null, ENUM.CoapTypes.COAP_CONFIRMABLE_TYPE, ENUM.CoapCode.COAP_PUT_METHOD, null, null, [], params.content);   
    publish.setToken(Buffer.from(params.token.toString(), 'utf8').toString('hex')); 
   // publish.setToken(params.token);  
    publish.addOption(ENUM.CoapOptionDefinitions.COAP_URI_PATH_OPTION, params.topic);
    publish.addOption(ENUM.CoapOptionDefinitions.COAP_ACCEPT_OPTION, qosBuf);
    publish.addOption(ENUM.CoapOptionDefinitions.COAP_NODE_ID_OPTION, params.clientID);
    try {
        var encPublish = parser.encode(publish);
    } catch (error) {
        console.log('Parser can`t encode Publish params.');
    }
    messages.pushMessage(params.token, params);
    this.emit('coappublish', encPublish, params.token, params);
}


function onDataRecieved(data) {
    var that = this;
    var decoded = {};    
    var parentEvent = 'coapresponse';
    console.log("Data received: ", data);   
    console.log("Data type decoded", ENUM.getKeyByValue(ENUM.CoapTypes, (parser.decode(data)).getType()));
   
    try {
        decoded = parser.decode(data);
    } catch (error) {
        console.log('Parser unadble to decode received data.');
    }
    if (decoded.getCode() == ENUM.CoapCode.COAP_POST_METHOD || decoded.getCode() == ENUM.CoapCode.COAP_PUT_METHOD) {
         var opts = decoded.getOptions();
       
        for(var i=0; i<opts.length; i++){
            if(opts[i])
            if(opts[i].getNumber() == ENUM.CoapOptionDefinitions.COAP_URI_PATH_OPTION) {
                var topic = decoded.getOptionValue(ENUM.CoapOptionDefinitions.COAP_URI_PATH_OPTION);
                if (topic.length > 0) {
                    this.emit('coappublishreceived', decoded);
                } else {                   
                    var ack = COAPmessage(null, ENUM.CoapTypes.COAP_ACKNOWLEDGMENT_TYPE, ENUM.CoapCode.COAP_METHOD_NOT_ALLOWED_RESPONSE_CODE, decoded.getMessageID(), decoded.getToken(), [], '');
                    ack.addOption(ENUM.CoapOptionDefinitions.COAP_CONTENT_FORMAT_OPTION, "text/plain");
                    try {
                        var encAck = parser.encode(ack)
                    } catch (e) {
                        console.log('Parser unadble to encode Ack message.', e);
                    }
                    this.emit('coapsendresponse', encAck, parentEvent);
                }

            }
        }                
    }

    switch (decoded.getType()) {       
        case ENUM.CoapTypes.COAP_CONFIRMABLE_TYPE:
            var resp = COAPmessage(null, ENUM.CoapTypes.COAP_ACKNOWLEDGMENT_TYPE, ENUM.CoapCode.COAP_PUT_METHOD, decoded.getMessageID(), null, [], '');
             resp.setToken(Buffer.from(decoded.getToken().toString(), 'utf8').toString('hex'));
           
            try {
                var encResponse = parser.encode(resp)
            } catch (e) {
                console.log('Parser unadble to encode Ack message.', e);
            }
          
            this.emit('coapsendresponse', encResponse, parentEvent);
            break;

        //nonconfirmable here
        case ENUM.CoapTypes.COAP_NONCONFIRMABLE_TYPE:
            this.emit('coapackreceived', decoded);
            break;
        case ENUM.CoapTypes.COAP_ACKNOWLEDGMENT_TYPE:            
            this.emit('coapackreceived', decoded);             
              var ack = decoded;
            if (decoded.getCode() == ENUM.CoapCode.COAP_CONTENT_RESPONSE_CODE && topic.length > 0) {
                this.emit('coappublishreceived', decoded);
            }
            if (ack.getCode() == ENUM.CoapCode.COAP_GET_METHOD) {                     
                var observeOptionValue = ack.getOptionValue(ENUM.CoapOptionDefinitions.COAP_OBSERVE_OPTION);              
                //var topic = decoded.getOptionValue(ENUM.CoapOptionDefinitions.COAP_URI_PATH_OPTION);               
                var token = ack.getToken()  
              
                if (observeOptionValue == 0) {
                    this.emit('coapsubackreceived', ack, token);
                } else if (observeOptionValue == 1) {
                    this.emit('coapunsubackreceived', ack, token);
                }
            } else if (ack.getCode() == ENUM.CoapCode.COAP_PUT_METHOD) {     
                 var token = decoded.getToken()      
                var topic = null;
                var topic = ack.getOptionValue(ENUM.CoapOptionDefinitions.COAP_URI_PATH_OPTION);
              
                var content = decoded.getPayload(); 
               
                //  emit pubackReceived(this, topic, 0, content, false, false, 0);   !!!!!!!!!!!!!!!!!!!!!!!
                this.emit('coappubackreceived', token);
            }
            break;
        case ENUM.CoapTypes.COAP_RESET_TYPE:
            this.emit('coapackreceived', decoded);
            break;
    }

}



