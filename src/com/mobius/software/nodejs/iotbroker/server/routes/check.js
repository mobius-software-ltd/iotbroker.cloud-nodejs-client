var express = require('express');
var router = express.Router();
var Datastore = require('nedb');
var db = new Datastore({ filename: 'data' });

router.post('/', function(req, res) {
    db.loadDatabase();
    db.find({ 
        "type":"connack",  "unique": req.body.unique
    }, function(err, docs) {
        if(docs.length)
            res.send(true);
        else
            res.send(false);
    });
})



module.exports = router