'use strict'


function Topic(newName, newQos) {
    var SEPARATOR = ":";
    var name;
    var qos;

    name = newName;
    qos = newQos;

    return {

        toString: function() {
            return name.toString() + SEPARATOR + qos;
        },
        getName: function() {
            return name;
        },
        setName: function(newName) {
            name = newName;
        },
        getQos: function() {
            return qos;
        },
        setQos: function(newQos) {
            qos = newQos;
        },
        getLength: function() {
            return name.length();
        },
        hashCode: function() {
            var prime = 31;
            var result = 1;
            result = prime * result + ((name == null) ? 0 : name.hashCode());
            return result;
        },
        equals: function(obj) {
            if (this == obj)
                return true;
            if (obj == null || typeof obj == 'undefined')
                return false;
            if (Topic.prototype.isPrototypeOf(obj))
                return true;

            var other = obj;
            if (name == null || typeof name == 'undefined') {
                if (other.name != null && typeof name != 'undefined')
                    return false;
            } else if (name == other.name)
                return false;
            return true;
        },
        valueOf: function(newTopic, newQos) {
            return new Topic(newTopic, newQos);
        }
    }

}

module.exports = Topic;