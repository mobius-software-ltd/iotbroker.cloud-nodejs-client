


var args = process.argv.slice(2);

var bus = require('servicebus').bus();

var cluster = require('cluster');
var Connect = require('./lib/SNconnect');
const dgram = require('dgram');
var udp = dgram.createSocket('udp4');
var numCPUs = args[0] || require('os').cpus().length;
var parser = require('./SNParser');

var TOKENS = require('./lib/Tokens');
var TIMERS = require('./lib/Timers');
var Timer = require('./lib/Timer');
if (cluster.isMaster) {
    if (!module.parent) {
        for (var i = 0; i < numCPUs; i++) {
            worker[i] = cluster.fork();
        }
    }
} else {
    setTimeout(function() {
        var vm = this;
        var connections = {};
        var connectionParams = {};
        var timers = {};
        var tokens = {};

        bus.listen('udp.newSocket', function(msg) {   
            var host = msg.params.connection.host;
            var port = msg.params.connection.port;
            vm.port = msg.params.connection.port;
            vm.host = msg.params.connection.host;
            if(msg.params.connection.will) {
            msg.params.connection.flag = msg.params.connection.will.topic && msg.params.connection.will.content ? 1 : 0;
            } else {
                msg.params.connection.flag = 0;
            }
           // var oldUnique=vm.clientID;
            var oldUnique = vm.unique;
            vm.clientID = msg.params.connection.clientID || 'MQTT-SN-' + Math.random().toString(18).substr(2, 16);
            vm.unique =  msg.params.connection.unique;

            if (typeof oldUnique != 'undefined') {
                timers[oldUnique].releaseTimer(-1);
                timers[oldUnique].releaseTimer(-2);
               // tokens[oldUnique].releaseToken(data.getPacketID());
                delete timers[oldUnique];
                delete connections[oldUnique];
                delete connectionParams[oldUnique];
                delete tokens[oldUnique];             
                udp.close()
                oldUnique = undefined;
                connections = {};
                connectionParams = {};
                timers = {};
                tokens = {};               
                udp = dgram.createSocket('udp4');
            }
               


            udp.clientID = msg.params.connection.clientID;
            udp.unique = msg.params.connection.unique;
            udp.connection = msg.params.connection;

             if (typeof oldUnique == 'undefined') {                
                udp.on('message', function onDataReceived(data, rinfo) {  
                    bus.publish('sn.datareceived', {
                        payload: data,
                        clientID: vm.clientID,
                        unique: vm.unique
                    });                  
                });
            }            

            try {
                var connect = Connect({
                    clientID: msg.params.connection.clientID || 'MQTT-SN-' + Math.random().toString(18).substr(2, 16),
                    cleanSession: msg.params.connection.isClean,
                    keepalive: msg.params.connection.keepalive,
                    willFlag:  msg.params.connection.flag,
                })
            
               
            vm.connectCount = 0;
            var message = parser.encode(connect);  
            bus.publish('udp.senddata', {
                payload: message,
                clientID: msg.params.connection.clientID,
                unique: msg.params.connection.unique,
                parentEvent: 'sn.connect',
                connectCount: 1
            });
            
            } catch(e) {
                console.log('Unable to establish connection to the server. Error: ', e);
            }    
            connectionParams[msg.params.connection.unique] = msg;
            connections[msg.params.connection.unique] = udp;
            timers[msg.params.connection.unique] = new TIMERS();        
        })
        
        bus.subscribe('udp.senddata', function(msg) {  
         
            if (msg.parentEvent == 'snwilltopic' || msg.parentEvent == 'snwillmsg') {
                timers[msg.unique].releaseTimer(-1);                
            }     
             
           
            if (typeof connections[msg.unique] == 'undefined') return;
            if ( msg.parentEvent != 'snpublishQos0' && msg.parentEvent != 'snregackout' && msg.parentEvent != 'snpubackout' && msg.parentEvent != 'snregister' && msg.parentEvent != 'sn.disconnect' && msg.parentEvent != 'sn.disconnectin' && msg.parentEvent != 'snpubackout' && msg.parentEvent != 'snpubrecout' && msg.parentEvent != 'snpubcompout' && msg.parentEvent != 'snwilltopic' && msg.parentEvent != 'snwillmsg') {
                var newTimer = Timer({
                    callback: function() {
                        try {      
                            if( msg.parentEvent == 'sn.connect') {
                                msg.connectCount++
                                if(msg.connectCount == 5) {
                                    timers[msg.unique].releaseTimer(-1);
                                }
                            }    
                                           
                            var message = Buffer.from(msg.payload)
                            udp.send(message, vm.port, vm.host, function(err){                                
                            });
                        } catch (e) {
                            console.log('Unable to establish connection to the server. Error: ', e);
                            if (typeof timers[msg.unique] != 'undefined') {
                                timers[msg.unique].releaseTimer(msg.packetID);
                                delete timers[msg.unique];
                            }
                            if (typeof connections[msg.unique] != 'undefined') {
                                //connections[msg.unique].end();
                                delete connections[msg.unique];
                            }
                            if (typeof connectionParams[msg.unique] != 'undefined')
                                delete connectionParams[msg.unique];
                            return;
                        }
                    },
                    interval: connections[msg.unique].connection.keepalive * 1000
                });
                if(msg.parentEvent == 'sn.connect') {
                    timers[msg.unique].setTimer(-1, newTimer);
                } else if(msg.parentEvent == 'snpingreq') {    
                    timers[msg.unique].setTimer(-2, newTimer);                    
                }  else if(msg.parentEvent == 'snpublish' || msg.parentEvent == 'snpubrel' || msg.parentEvent == 'snsubscribe' || msg.parentEvent == 'snunsubscribe') {
                         timers[msg.unique].setTimer(msg.packetID, newTimer);
              
                }  
            }
            try {
                 udp.send(Buffer.from(msg.payload), vm.port, vm.host, function(err){  

                });
               
                if (msg.parentEvent == 'sn.disconnect') {
                        // timers[msg.unique].releaseTimer(msg.packetID); 
                    timers[msg.unique].releaseTimer(-2);
                    timers[msg.unique].releaseTimer(-1);                  
                    delete timers[msg.unique];
                    delete connections[msg.unique];
                    delete connectionParams[msg.unique];
                }
            } catch (e) {
                console.log('Unable to establish connection to the server. Error: ', e);
                if (typeof timers[msg.unique] != 'undefined') {
                    timers[msg.unique].releaseTimer(msg.packetID);
                    delete timers[msg.unique];
                }
                if (typeof connections[msg.unique] != 'undefined') {
                    connections[msg.unique].end();
                    delete connections[msg.unique];
                }
                if (typeof connectionParams[msg.unique] != 'undefined')
                    delete connectionParams[msg.unique];
                return;
            }           
        });
       

        

        bus.subscribe('udp.done', function(msg) {
            if(msg.parentEvent == 'snconnack') {
                timers[msg.unique].releaseTimer(-1);
            }
            if(msg.parentEvent == 'snpuback' || msg.parentEvent == 'snpubrec' || msg.parentEvent == 'snpubcomp' || msg.parentEvent == 'snsuback' || msg.parentEvent == 'snunsuback') {
                timers[msg.unique].releaseTimer(msg.packetID);
            }
          
            if (typeof timers[msg.unique] == 'undefined') return;
            
          
            if (msg.parentEvent == 'sn.disconnect' || msg.parentEvent == 'sn.disconnectin') {
                timers[msg.unique].releaseTimer(-1);
                timers[msg.unique].releaseTimer(-2);
                timers[msg.unique].releaseTimer(msg.packetID);
                //connections[msg.unique].close();
                delete timers[msg.unique];
                delete connections[msg.unique];
                delete connectionParams[msg.unique];
                
            }            
        });
        
        

    }, 100 * (cluster.worker.id + 4));
}