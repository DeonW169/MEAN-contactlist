var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

var redisClient = require('redis').createClient;
var redis = redisClient(6379, 'localhost');

var CONTACTS_COLLECTION = "contacts";

var access = require('./access.js');

var app = express();
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect(process.env.MONGODB_URI, function (err, database) {
  if (err) throw 'Error connecting to db - ' + err;

  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready");

  // Initialize the app.
  var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
});

// CONTACTS API ROUTES BELOW

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

/*  "/contacts"
 *    GET: finds all contacts
 *    POST: creates a new contact
 */

app.get("/contacts", function(req, res) 
{
  db.collection(CONTACTS_COLLECTION).find({}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get contacts.");
    } else {
      res.status(200).json(docs);
    }
  });
});

/*app.post("/contacts", function(req, res) {
  var newContact = req.body;
  newContact.createDate = new Date();

  if (!(req.body.firstName || req.body.lastName)) {
    handleError(res, "Invalid user input", "Must provide a first or last name.", 400);
  }

  db.collection(CONTACTS_COLLECTION).insertOne(newContact, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new contact.");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});*/

app.post('/contacts', function (req, res) 
    {
        if (!req.body.firstName || !req.body.lastName) res.status(400).send("send firstName and lastName for contact");
        else if (!req.body.text) res.status(400).send("send some text the contact");
        else {
            access.saveContact(db, req.body.firstName, req.body.lastName, req.body.text, function (err) 
            {
                if (err) res.status(500).send("Server error");
                else res.status(201).send("Saved");
            });
        }
    });

/*  "/contacts/:id"
 *    GET: find contact by id
 *    PUT: update contact by id
 *    DELETE: deletes contact by id
 */

/*app.get("/contacts/:id", function(req, res) {
  db.collection(CONTACTS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) }, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to get contact");
    } else {
      res.status(200).json(doc);
    }
  });
});*/

app.get('/contacts/:firstName', function (req, res) 
{
    if (!req.param('firstName')) res.status(400).send("send a firstName");
    else {
          access.findContactByFirstNameCached(db, redis, req.param('firstName'), function (contact) 
          {
              if (!text) res.status(500).send("Server error");
              else res.status(200).send(contact);
          });
      }
  });

/*app.put("/contacts/:id", function(req, res) {
  var updateDoc = req.body;
  delete updateDoc._id;

  db.collection(CONTACTS_COLLECTION).updateOne({_id: new ObjectID(req.params.id)}, updateDoc, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to update contact");
    } else {
      res.status(204).end();
    }
  });
});*/

app.put('/contacts/:firstName', function (req, res) 
{
    if (!req.param("firstName")) res.status(400).send("send the contact firstName");
    else if (!req.param("text")) res.status(400).send("send the new text");
    else {
          access.updateContactByFirstName(db, redis, req.param("firstName"), req.param("text"), function (err) 
          {
              if (err == "Missing contact") res.status(404).send("Contact not found");
              else if (err) res.status(500).send("Server error");
              else res.status(200).send("Updated");
          });
      }
  });

app.delete("/contacts/:id", function(req, res) {
  db.collection(CONTACTS_COLLECTION).deleteOne({_id: new ObjectID(req.params.id)}, function(err, result) {
    if (err) {
      handleError(res, err.message, "Failed to delete contact");
    } else {
      res.status(204).end();
    }
  });
});