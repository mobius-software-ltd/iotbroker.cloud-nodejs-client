(function() {
    'use strict';

    sessionFactory.$inject = ["toastr", "$location", "$rootScope"];
    angular
        .module('mqtt')
        .factory('sessionFactory', sessionFactory)

    /** @ngInject */
    function sessionFactory(toastr, $location, $rootScope) {

        return {
            getSessionData: getSessionData,
            setSessionData: setSessionData,
            pushTopic: pushTopic,
            popTopic: popTopic,
            getTopics: getTopics            
        }

        var session = {};
        var topics = [];       

        function getSessionData() {
            if (typeof session == 'undefined')
                session = angular.fromJson(sessionStorage.getItem('mqttSession'));
            if (typeof session == 'undefined' || session == null) {
                $rootScope.auth = false;                
                $location.path('/');
                return;
            }
            $rootScope.auth = true;
            return session;
        }

        function setSessionData(data) {
            sessionStorage.setItem('mqttSession', angular.toJson(data));
            if (typeof data == 'undefined')
                sessionStorage.removeItem('mqttSession');
            session = data;

            if(data) addUserToStorage(data);
            
            $rootScope.auth = true;
        }   

        function pushTopic(newTopics) {
            topics = [];
            for (var i = 0; i < newTopics.length; i++) {
                var f = 0;
                for (var j = 0; j < topics.length; j++) {
                    if (topics[j].topic == newTopics[i].subscribtion.topic)
                        f = 1;
                }
                if (f != 1)
                    topics.push(newTopics[i].subscribtion);
                f = 0;
            }
        }

        function popTopic(topic) {
            var index = topics.indexOf(topic);
            topics.splice(index, 1)
        }

        function getTopics() {
            return topics;
        }
    }

}());