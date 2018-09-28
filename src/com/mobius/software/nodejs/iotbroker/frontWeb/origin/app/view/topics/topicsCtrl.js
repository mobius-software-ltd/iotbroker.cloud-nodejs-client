(function() {
    'use strict';

    topicsCtrl.$inject = ["$scope", "dataFactory", "sessionFactory"];
    angular
        .module('mqtt')
        .controller('topicsCtrl', topicsCtrl)

    /** @ngInject */
    function topicsCtrl($scope, dataFactory, sessionFactory) {
        var vm = this;
        var sessionData;
        vm.sessionData = sessionFactory.getSessionData();
        vm.topics = [];
        vm.newItem = {};
        vm.deleteItem = deleteItem;
        vm.addItem = addItem;


        $scope.popover = {
            templateUrl: '/view/topics/modal.html',
            title: 'Add new topic'
        };

        $scope.deletePopover = {
            templateUrl: '/view/topics/popoverDelete.html',
            title: 'Unsubscribe from topic?'
        };

        init();

        function deleteItem(params) {
            // console.log(params.item);
            if (typeof params.item == 'undefined') return;
            dataFactory.unsubscribe({
                topics: [params.item.topic],
                username: sessionData.username,
                clientID: sessionData.clientID,
                type: sessionData.type,
                topic: [params.item]    
            }).then(function(data) {
                setTimeout(function() {
                    getTopics();
                    // console.log(vm.topics);
                }, 2000);
                document.body.click();
            });
        }

        function addItem() {
            // console.log(vm.newItem);
            if ((typeof vm.newItem.qos == 'undefined' && vm.sessionData.type.id != 3) || typeof vm.newItem.topic == 'undefined') return;
            dataFactory.subscribe({
                topics: [vm.newItem],
                username: sessionData.username,
                clientID: sessionData.clientID,
                type: sessionData.type       
            }).then(function(data) {
                setTimeout(function() {
                    getTopics();
                }, 1000);
                vm.newItem = {};
                document.body.click();
            });
        }

        function getTopics() {
             dataFactory.getTopics({
                username: sessionData.username,  
                clientID: sessionData.clientID,
                type: sessionData.type         
            }).then(function(data) {
                if (data.data.length > 0) {
                    sessionFactory.pushTopic(data.data);
                }
                vm.topics = [];
                vm.topics = sessionFactory.getTopics();
            });
        }

        function init() {
            sessionData = sessionFactory.getSessionData();
            if (!!sessionData)
                getTopics();
        }

    }

}());