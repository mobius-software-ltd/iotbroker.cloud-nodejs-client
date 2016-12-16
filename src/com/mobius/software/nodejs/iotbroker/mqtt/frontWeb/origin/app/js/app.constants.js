(function() {
    'use strict';

    angular
        .module('mqtt')
        .constant('mqttConstants', {
            API_SERVER_URL: 'http://localhost:8888',
            API_CONNECT_URL: '/connect',
            API_DISCONNECT_URL: '/disconnect',
            API_PUBLISH_URL: '/publish',
            API_SUBSCRIBE_URL: '/subscribe',
            API_UNSUBSCRIBE_URL: '/unsubscribe',
            API_MESSAGES_URL: '/getmessages',
            API_TOPICS_URL: '/gettopics'
        });

}());