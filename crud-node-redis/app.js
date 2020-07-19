const express = require('express');
const redis = require('redis');
const Joi = require('joi');
const async = require('async');

const app = express();
app.use(express.json());
const port = process.env.PORT || 3001;
const redis_port = process.env.REDIS_PORT || 6379;

const redis_cli = redis.createClient(redis_port);

// const genres = [
//     {id : 1, name : "Action" },
//     {id : 2, name : "Adventure" },
//     {id : 3, name : "Comedy" },
//     {id : 4, name : "Crime" },
//     {id : 5, name : "Drama" },
//     {id : 6, name : "Fantasy" },
//     {id : 7, name : "Historical" },
//     {id : 8, name : "Historical fiction" },
//     {id : 9, name : "Horror" },
//     {id : 10, name : "Mystery" }
// ];

//Post new genre to redis
app.post('/api/genres', (req, res) => {
     var { error } = validateGenre(req.body);
     if(error) return res.send(error.details[0].message); 
    const genre = {
        'Id' : req.body.Id,
        'Name' : req.body.Name,
        'CreatedDate' : new Date().toISOString()
    };
    redis_cli.hmset('Genres_' + req.body.Id, genre, (err, obj) => {
        if(err) return  res.send(err);
        else return res.send(genre);
    });
});

// Update genre by id
app.put('/api/genres/:id', (req, res) => {
    redis_cli.hgetall("Genres_" + req.params.id, (err, value) => {
        if(err) return res.send(err);
        else
        {
             const obj = {
                 'Name' : req.body.Name,
                 'Id' : req.params.id
             };            
            var { error } = validateGenre(obj);
            if(error) return res.send(error.details[0].message);
            redis_cli.hmset("Genres_" + value.Id, obj, (error, result)=>{
                if(error) return res.send(error);
                else return res.send(result);
            });
        }
    });
});

// filter by Genre type Ex : ACT - Action, COM - Comedy, DRM - Drama ex...
app.get('/api/genres/:genre_type', (req, res) => {
    redis_cli.keys('Genres_' + req.params.genre_type + '*', (err, keys) => {
        if(err) return res.send(err);
        else
        {
            async.map(keys, (key, callback) => {
                redis_cli.hgetall(key, (error, obj) => {
                    if(error) return res.send(error);
                    else
                    {
                        callback(null, obj);
                    }
                });
            },
            (error, results) => {
                if(error) return res.send(error);
                else return res.send(results);
            });
        }
    });
});

//Genre delete by id and return deleted item
app.delete('/api/genres/:id', (req, res) => {
    const genre = "";
    redis_cli.hgetall("Genres_" + req.params.id, (err, obj) => {
        if(err) return res.status(404).send("The genre with given id connot find");  
        else {
            redis_cli.del("Genres_" + req.params.id, (error, result) => {
                if(error) return res.send(error);
                else return res.send(obj);
            });
        }
    });
});

//Get all are availlable genres 
app.get('/api/genres', (req, res) => {   
    redis_cli.keys("Genres_*", (err, keys) =>{
        if(err) return res.send(err);
        else
        {
            async.map(keys, function(key, cb){
                redis_cli.hgetall(key, (error, value) => {
                    if(error) return res.send(error);
                    else
                    {
                        var job = {};
                        job = value;
                        cb(null, job);
                    }
                });
            },
            function(error, results) {
                if(error) return res.send(error);
                else return res.send(results);
            });
        }
    });
});

//Get Genre by Id
app.get('/api/genres/:id', (req, res) => {
    redis_cli.hgetall("Genres_" + req.params.id, (err, obj) => {
        if(err) return res.send(err);
        else
        {
            obj.Id = req.params.id;            
            return res.send(obj);
        }            
    });
});

function validateGenre(genre)
{
    const schema = {
        Id : Joi.string().min(3).required(),
        Name : Joi.string().min(3).required()
    };
    return Joi.validate(genre, schema);
}

app.listen(port, () => console.log(`Application listen to port ${port}....`));