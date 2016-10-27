module.exports.saveContact = function (db, firstName, lastName, text, callback) 
{
    db.collection('text').save({
        firstName: firstName,
        lastName: lastName,
        text: text
    }, callback);
};

module.exports.findContactByFirstNameCached = function (db, redis, firstName, callback) 
{
    redis.get(firstName, function (err, reply) 
    {
        if (err) callback(null);
        else if (reply) //Contact is in the cache
        callback(JSON.parse(reply));
        else {
            //Contact is not in cache - get from db
            db.collection('text').findOne({
                firstName: firstName
            }, function (err, doc) 
            {
                if (err || !doc) callback(null);
                else {\\Contact found in database, save to cache and
                    return to client
                    redis.set(firstName, JSON.stringify(doc), function () {
                        callback(doc);
                    });
                }
            });
        }
    });
};

module.exports.access.updateContactByFirstName = function (db, redis, firstName, newText, callback) 
{
    db.collection("text").findAndModify({
        firstName: firstName
    }, {
        $set: {
            text: text
        }
    }, function (err, doc) 
    { //Update db
        if (err) callback(err);
        else if (!doc) callback('Missing contact');
        else {
            //Save to cache
            redis.set(firstName, JSON.stringify(doc), function (err) 
            {
                if (err) callback(err);
                else callback(null);
            });
        }
    });
};