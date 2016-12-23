(function() {
    'use strict';

    angular
        .module('mqtt')
        .factory('dataFactory', dataFactory)

    /** @ngInject */
    function dataFactory($http, mqttConstants, $location, toastr, $q) {

        return {
            connect: connect,
            getMessages: getMessages,
            publish: publish,
            getTopics: getTopics,
            subscribe: subscribe,
            unsubscribe: unsubscribe,
            disconnect: disconnect
        }

        function connect(customer) {

            $http.post(mqttConstants.API_SERVER_URL + mqttConstants.API_CONNECT_URL, customer)
                .then(function(data) {
                    if (data.data.length < 1) {
                        toastr.error('Login failed!');
                        return;
                    }
                    $location.path('/topics');
                    console.log(data);
                    toastr.success('Successfully logged in!', data);
                }, function(data) {
                    console.log(data);
                    toastr.error(data.data, 'Oops some error here!');

                })
                .catch(function(error) {

                });
        }

        function disconnect(params) {
            $http.post(mqttConstants.API_SERVER_URL + mqttConstants.API_DISCONNECT_URL, params)
                .then(function(data) {
                    $location.path('/');
                    toastr.success('Successfully logged out!', data);
                }, function(data) {
                    toastr.error(data.data, 'Oops some error here!');

                })
                .catch(function(error) {
                    console.log(error);
                });
        }

        function getMessages(params) {
            var data = {

            }
            var def = $q.defer();

            $http.post(mqttConstants.API_SERVER_URL + mqttConstants.API_MESSAGES_URL, params)
                .then(function(data) {
                    // console.log(data);
                    def.resolve(data);
                    // toastr.success('Successfully logged in!', data);
                }, function(data) {
                    // console.log(data);
                    toastr.error(data.data, 'Oops some error in getting messages!');

                })
                .catch(function(error) {

                });
            return def.promise;
        }

        function publish(params) {
            $http.post(mqttConstants.API_SERVER_URL + mqttConstants.API_PUBLISH_URL, params)
                .then(function(data) {
                    // $location.path('/topics');
                    // console.log(data);
                    toastr.success('Successfully published!', data);
                }, function(data) {
                    // console.log(data);
                    toastr.error(data.data, 'Oops some error here!');

                })
                .catch(function(error) {

                });
        }

        function getTopics(params) {
            var def = $q.defer();
            $http.post(mqttConstants.API_SERVER_URL + mqttConstants.API_TOPICS_URL, params)
                .then(function(data) {
                    def.resolve(data);
                }, function(data) {
                    console.log(data);
                    toastr.error(data.data, 'Oops some error here!');

                })
                .catch(function(error) {

                });

            return def.promise;
        }

        function subscribe(params) {
            console.log(params);
            var def = $q.defer();
            $http.post(mqttConstants.API_SERVER_URL + mqttConstants.API_SUBSCRIBE_URL, params)
                .then(function(data) {
                    def.resolve(data);
                    console.log(data);
                    toastr.success('Successfully subscribed!')
                })
                .catch(function(data) {
                    console.log(data);
                });
            return def.promise;
        }

        function unsubscribe(params) {
            console.log(params);
            var def = $q.defer();
            $http.post(mqttConstants.API_SERVER_URL + mqttConstants.API_UNSUBSCRIBE_URL, params)
                .then(function(data) {
                    def.resolve(data);
                    console.log(data);
                    toastr.success('Successfully unsubscribed!')
                })
                .catch(function(data) {
                    console.log(data);
                });
            return def.promise;
        }
    }

}());