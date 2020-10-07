const { response } = require('express');
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const SortedSet = require('redis-sorted-set');
const mySet = new SortedSet();
const redis = require('redis');
const client = redis.createClient();

router.get('/',async (req, res) => {
    client.get("http://localhost:3000/shows", function(err, obj){
        if(!obj){
            fetch("http://api.tvmaze.com/shows")
            .then((response) => {
                return response.json(); 
            })
            .then((jsonData) => {
                console.log(jsonData);
                res.render('shows/showlist', {shows: jsonData}, function(err, html){
                    client.set("http://localhost:3000/shows", String(html), function(err){
                        if(err){
                            return console.error(err);
                        }
                    });
                    res.send(html);
                });
            }); 
        }else{
            res.send(obj);
        }  
    });
});

router.get('/show/:id',async (req, res) => {
    const Id = req.params.id;
    const key = 'http://localhost:3000/shows/show/' + String(Id);
    client.get(key, function(err, obj){
        if(!obj){
            try {
                fetch("http://api.tvmaze.com/shows/" + Id)
                .then((response) => {
                    return response.json(); 
                })
                .then((jsonData) => {
                    console.log(jsonData);
                    if(jsonData.status == 404){
                        res.render('shows/error', {has404Error: true});
                    }else{
                        res.render('shows/show', {show: jsonData}, function(err, html){
                            client.set(key, String(html), function(err){
                                if(err){
                                    return console.log(err);
                                }
                            });
                            res.send(html);
                        });
                    } 
                });
            } catch (error) { 
                res.status(404).json({error: 'Not Found'});
            }
        }else{
            res.send(obj);
        }
    });
});

router.post('/search', async (req, res) => {
    const SearchTerm = req.body.searchTerm; 
    let error = [];
    if(!SearchTerm){
        error.push('No search term provided!')
    }else if(SearchTerm.match(/^[ ]+$/)){
        error.push('Empty space is not a valid search term!')
    }
    if(error.length > 0){
        res.render('shows/error',{
            errors: error,
            hasErrors: true
        });
    }else{
        console.log(SearchTerm);
        if(mySet.has(SearchTerm)){
            mySet.add(SearchTerm, mySet.get(SearchTerm) + 1);
        }else{
            mySet.add(SearchTerm, 1);
        }
        client.get(SearchTerm, function(err, obj){
            if(!obj){
                fetch("http://api.tvmaze.com/search/shows?q=:" + SearchTerm)
                .then((response) => {
                    return response.json(); 
                })
                .then((jsonData) => {
                    console.log(jsonData);
                    if(JSON.stringify(jsonData) == '[]'){
                        error.push('No shows found related to this search term, try another one!');
                        res.render('shows/error', {
                            errors: error,
                            hasErrors: true
                        });
                    }else{
                        res.render('shows/searchresults', {shows: jsonData}, function(err, html){
                            client.set(SearchTerm, String(html), function(err){
                                if(err){
                                    return console.error(err);
                                }
                            });
                            res.send(html);
                        });
                    }
                    
                });
            }else{
                res.send(obj);
            }
        });
    }
});

router.get('/popularsearches', async (req, res) => {
    console.log(mySet);
    const len = mySet.length;
    if(len < 10){
        const rankList1 = mySet.range(0,len-1).reverse();
        res.render('shows/topsearches', {list: rankList1});
    }else{
        const rankList2 = mySet.range(0,9).reverse();
        res.render('shows/topsearches', {list: rankList2});
    }
})

module.exports = router;