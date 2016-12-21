var mem = require('amnesia');
const cluster = require('cluster');

mem.conf = [{
    "host": "127.0.0.1",
    "port": 57300
}, ]; //PORT FROM 57301

mem.on('log', function(data) {
    // console.log(data);
})

var bus = function bus() {
    var changes = 0;
    var tryNum = 0;

    function subscribe(topic, callback) {
        var timer = setInterval(function() {
            if (mem.initialized) {
                mem.on('change', function(oldValue, newValue, remoteUpdate) {
                    var newData = newValue;
                    if (typeof oldValue != 'undefined') {
                        var oldData = oldValue;
                        var oldMsg = oldData[prop];
                    }
                    // console.log('oldValue: ', oldValue);

                    var prop = topic.toString();
                    var msg = newData[prop];
                    if (!!msg && !oldMsg)
                        if (typeof msg.id == 'undefined') {
                            // console.log('SUSCRIBE MSG', msg);
                            delete newData[prop];
                            mem.data = newData;
                            callback.call(this, msg);
                        }
                });
                clearInterval(timer);
            }
        }, 50);
    }

    function listen(topic, callback) {
        var timer = setInterval(function() {
            if (mem.initialized) {

                // console.log('mem.id: ', mem.conf.id);
                // if (mem.conf.id == 0) {
                if (typeof mem.data == 'undefined') {

                    var data = {};
                    // var data = mem.data;
                    if (typeof data.busListeners == 'undefined') {
                        data['busListeners'] = new Object();
                        data.busListeners[topic] = [];
                    } else if (typeof data.busListeners[topic] == 'undefined') {
                        data.busListeners[topic] = [];
                    }
                    data.busListeners[topic].push(cluster.worker.id);
                    mem.data = data;
                } else {
                    var initTimer = setInterval(function() {
                        // console.log('MEM DATA:', mem.data);
                        if (typeof mem.data != 'undefined') {
                            var data = clone(mem.data);
                            // console.log('DATA: ', data);
                            if (typeof data.busListeners == 'undefined') {
                                // console.log('!=1 MEM DATA:', mem.data);
                                console.log('data:', data, 'clusterID:', cluster.worker.id)
                                data['busListeners'] = new Object();
                                data.busListeners[topic] = [];
                            } else if (typeof data.busListeners[topic] == 'undefined') {
                                data.busListeners[topic] = [];
                            }
                            // console.log('indexof:', data.busListeners[topic].indexOf(mem.conf.id));
                            if (data.busListeners[topic].indexOf(mem.conf.id) == -1)
                                data.busListeners[topic].push(mem.conf.id);
                            mem.data = data; //JSON.parse(JSON.stringify(data));

                            clearInterval(initTimer);
                        }
                    }, 25);
                }
                clearInterval(timer);
            }
        }, Math.floor(100 * cluster.worker.id) * (tryNum % 2));
        tryNum++;
        mem.on('change', function(oldValue, newValue, remoteUpdate) {
            changes++;
            var newData = newValue;
            var prop = topic.toString();
            var msg = newData[prop];
            // console.log(typeof newData)
            if (typeof msg != 'undefined' && typeof newData.busListeners[prop] != 'undefined' && newData.busListeners[prop].length > 0 && typeof newData[prop] != 'undefined') {
                if (typeof msg.id != 'undefined') {
                    if (newData.busListeners[prop].includes(msg.id) && cluster.worker.id == msg.id) {
                        // console.log('newData[prop]: ', prop, newData[prop]);
                        console.log('mem.conf.id.toString(): ', mem.conf.id);
                        console.log('msg.id.toString(): ', msg.id);
                        console.log('newData', newData);
                        delete msg.id;
                        delete newData[prop];
                        console.log('newData', newData);
                        // console.log(newData)
                        mem.data = newData;
                        //             // console.log('CALLBACK: ', callback);
                        callback.call(this, msg);
                    }
                }
            }
        });
    }

    function publish(topic, msg) {
        console.log('publish called', msg)

        var data = JSON.parse(JSON.stringify(mem.data)) || {};
        var prop = topic.toString();
        data[prop] = msg;
        console.log('PUBLISH DATA:', data)
        console.log('PUBLISH TOPIC:', topic)
        console.log('PUBLISH MESSAGE:', msg)
        mem.data = data;
    }

    function send(topic, msg) {
        console.log('send called')

        var data = JSON.parse(JSON.stringify(mem.data)) || {};
        msg.id = mem.conf.id;
        // console.log('SEND topic:', topic, '_msg: ', msg);
        // console.log('data: ', data);
        if (typeof data.busListeners[topic] != 'undefined') {
            // console.log('Listeners: ', data.busListeners[topic]);
            if (data.busListeners[topic].includes(msg.id)) {
                // console.log('Bus SEND: ', msg, topic);
                var prop = topic.toString();
                data[prop] = msg;
                mem.data = data;
                // console.log('MEM.DATA:', data);
            }
        }
    }

    function getId() {
        return mem.conf.id;
    }

    function clone(obj) {
        if (null == obj || "object" != typeof obj) return obj;
        var copy = obj.constructor();
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
        }
        return copy;
    }

    this.subscribe = subscribe;
    this.publish = publish;
    this.send = send;
    this.listen = listen;
    this.getId = getId;
    ///////////////////////////////////
    setInterval(function() {
        console.log('MEM DATA:', mem.data);
        console.log('changes', changes);
    }, 10000);
}


// module.exports = new Bus();
bus.instance = null;

bus.getInstance = function() {
    if (this.instance === null) {
        this.instance = new bus();
    }
    return this.instance;
}

module.exports = bus.getInstance();