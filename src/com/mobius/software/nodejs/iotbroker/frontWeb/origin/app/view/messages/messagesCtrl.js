(function() {
    'use strict';

    messagesCtrl.$inject = ["dataFactory", "sessionFactory", "toastr", "$location", "$rootScope", "$q"];
    angular
        .module('mqtt')
        .controller('messagesCtrl', messagesCtrl)

    /** @ngInject */
    function messagesCtrl(dataFactory, sessionFactory, toastr, $location, $rootScope, $q) {
        var vm = this;
        var sessionData = {};
        var timer;
        var topics = [];
        vm.messages = [];


        function getMessages() {
            dataFactory.getMessages({
                directions: ["in", "out"],
                topics: topics,
                username: sessionData.username,
                clientID: sessionData.clientID,
                type: sessionData.type,
                unique:  sessionData.unique
            }).then(function(data) {
                vm.messages = data.data;
            }).catch(function(data) {
                toastr.error(data, 'Oops some error here!');
            });
        }

        $rootScope.$on("$routeChangeStart", function() {
            clearInterval(timer);
        })

        function getTopics() {
            var def = $q.defer();
            dataFactory.getTopics({
                username: sessionData.username,
                clientID: sessionData.clientID,
                type: sessionData.type,
                unique:  sessionData.unique
            }).then(function(data) {
                if (data.data.length > 0) {
                    sessionFactory.pushTopic(data.data);
                }
                def.resolve();
            });
            return def.promise;
        }

        init();

        function init() {
            sessionData = sessionFactory.getSessionData();
            getTopics().then(function() {
                var allTopics = sessionFactory.getTopics();
                if(allTopics)
                for (var i = 0; i < allTopics.length; i++) {
                    topics.push(allTopics[i].topic);
                }
                getMessages();
            });
            if (typeof sessionData != 'undefined') {
                timer = setInterval(getMessages, 2000);
            }
        }

    }

}());