'use strict'


function Will(newTopic, newContent, newRetain) {
    var topic;
    var content; //byte[] 
    var retain; //bool


    topic = newTopic;
    content = newContent;
    retain = newRetain;

    return {

        retrieveLength: function() {
            // var len = topic.getLength();
            // console.log("will.retrieveLength 17 str", len)
            return topic.getLength() + content.length + 4;
        },

        getTopic: function() {
            return topic;
        },

        setTopic: function(newTopic) {
            topic = newTopic;
        },

        getContent: function() {
            return content;
        },

        setContent: function(newContent) {
            content = newContent;
        },

        getRetain: function() {
            return retain;
        },

        setRetain: function(newRetain) {
            retain = newRetain;
        },

        isValid: function() {
            return topic != null && topic.getLength() > 0 && content != null && topic.getQos() != null;
        },
    }
}

module.exports = Will;