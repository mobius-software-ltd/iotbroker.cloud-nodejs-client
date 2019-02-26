var express = require('express');
var router = express.Router();
var Datastore = require('nedb');
var db = new Datastore({ filename: 'userData' });

router.post('/', function(req, res) {
    db.loadDatabase();
    db.find({ }, function(err, docs) {
        if (!!err)
            res.send({ 'Error:': err });
        res.send(JSON.stringify(docs));
    });
})

router.post('/remove', function(req, res) {
    db.loadDatabase();
    db.remove({'clientID': req.body.clientID, 'type.name': req.body.type.name }, { multi: true }, function(err, docs) {
        if (!!err)
        res.send({ 'Error:': err });
      res.send(JSON.stringify(docs));
    });
})

module.exports = router