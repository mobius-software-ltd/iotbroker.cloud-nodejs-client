// var mem = require('amnesia');
const cluster = require('cluster');
var util = require('util');
var events = require('events').EventEmitter;
var Events = new events();
// mem.setup({
//     purgeInterval: 15000,
//     logger: console
// });
// Events.EventEmitter.call(mem);
// util.inherits(mem, Events.EventEmitter);
// console.log(mem);


// mem.set = function(topic, msg) {
//     console.log(topic, msg);

//     mem.store(topic, msg, function() {
//         mem.read(topic, function(err, value) {
//             console.log('Read value:', value);
//         });

//         Events.emit('change');
//     });
// }
var bus = function Bus() {

    var topics = {};

    var mem = require('memored');
    mem.get = function(topic) {
        mem.read(topic, function(err, value) {
            console.log(topic, value);
            Events.emit('cast', value);
        })
    }

    mem.set = function(topic, msg) {
        console.log('topic: ', topic, 'msg: ', msg);
        mem.read(topic, function(err, value) {
            if (typeof value == 'undefined') {

                mem.store(topic, msg, function() {
                    console.log('newMsg', msg);
                    mem.read(topic, function(err, value) {
                        topics[topic] = value;
                        // console.log('Read value:', value, 'from worker:', cluster.worker.id);
                        Events.emit('change', topic, value);
                    });

                });
            }

            if (typeof value != 'undefined') {
                // value[topic].push
                for (var attrname in msg) {
                    // console.log('MsgAttr', Array.isArray(value[attrname]));
                    if (Array.isArray(value[attrname]) && Array.isArray(msg[attrname])) {
                        value[attrname] = value[attrname].concat(msg[attrname]);
                    } else {
                        value[attrname] = msg[attrname];

                    }
                    // var newMsg = Object.assign({}, msg, value);
                }
                // console.log('MsgAttr', Array.isArray(value[topic]), value[topic]);
                // console.log('MsgAttr', Array.isArray(msg[topic]), msg[topic]);
                var newMsg = value; //msg[topic].concat(value[topic]);

                mem.store(topic, newMsg, function() {
                    console.log('newMsg', newMsg);
                    mem.read(topic, function(err, value) {
                        console.log('Read value:', value, 'from worker:', cluster.worker.id);
                        Events.emit('change', topic, value);
                    });

                });

            }

        })

        // console.log(topic, msg);

        // mem.store(topic, msg, function() {
        //     mem.read(topic, function(err, value) {
        //         console.log('Read value:', value);
        //     });

        //     Events.emit('change');
        // });
    }

    this.subscribe = function(topic, callback) {}

    this.listen = function(topic, callback) {
        // console.log('Listen for:', topic)
        var busListeners = {};
        busListeners[topic] = [];
        busListeners[topic].push(cluster.worker.id);
        var listeners = {
            busListeners: busListeners
        };

        mem.set('listeners', busListeners);

        Events.on('change', function(topic, value) {
            console.log('Topic:', topic, 'MSG:', value, 'from worker:', cluster.worker.id);

        });
    }

    this.publish = function(topic, msg) {
        mem.set(topic, msg);
    }

    this.send = function(topic, msg) {
        mem.set(topic, msg);
    }

    if (bus.caller != bus.getInstance) {
        throw new Error("This object cannot be instanciated");
    }
}
bus.instance = null;

bus.getInstance = function() {
    if (this.instance === null) {
        this.instance = new bus();
    }
    return this.instance;
}

module.exports = bus.getInstance();

// module.exports = Bus();