Snippets = new Meteor.Collection('snippets');
SearchResults = new Meteor.Collection('search_results');

function getHits (hit_id) {
  console.log("getHits: " + hit_id);
  return SearchResults.find ({ _id : hit_id });
}

if (Meteor.isClient) {

  Meteor.autorun(function () {
    Meteor.subscribe("Snippets");
    Meteor.subscribe("SearchResults", Session.get('hit_id'));
  }); 

  Meteor.Router.add({

    '/' : 'index',
    '/snippets' : 'snippets',
    '/search' : 'search',
    '/test': 'layout2',

    '/snip/:id': function (id)  {
      Session.set('snippet_id', id);
      return 'snip';
    },

    '*': 'not_found'

  });

  Template.snippet_form.events({

    'click button': function(event, template) {

      var raw = template.find("#raw").value;
      var language = template.find("#language").value;

      var snippet_id = Snippets.insert({
        raw : raw,
        language : language,
        when: new Date()
      });

      Session.set('snippet_id', snippet_id);
      Meteor.Router.to('/snip/' + snippet_id);

    }

  });

  Template.search.searchResults = function () {
    if (!SearchResults.find().count() == 0) {
      var hits = SearchResults.findOne().hits;
      return Snippets.find( { _id : { $in :  hits  } } );
    }
  }

  Template.snippets.snippets = function () {
    return Snippets.find( { }, { limit : 20, sort : { when : -1 } } );
  }

  Template.snippets.rendered = function () {
    $('pre code').each(function(i,e) {hljs.highlightBlock(e)});
  }

  Template.snip.snippet = function () {
    return Snippets.findOne(Session.get('snippet_id'));
  }

  Template.snip.rendered = function () {
    console.log('rendered');
    $('pre code').each(function(i,e) {hljs.highlightBlock(e)});
  }

  Template.snip.events({
    'click button' : function(event, template) {
      console.log('button clicked');
    }
  });

  Template.snip.helpers ({
    id: function () { 
      return Session.get('snippet_id');
    }
  });

  Template.search_form.events({

    'submit' : function(event, template) {
      event.preventDefault();

      ejs.client = ejs.jQueryClient('http://localhost:9200');

      var qstr = template.find(".search-query").value;

      var resultsCallBack = function(results) {

        if (!results.hits) {
          console.log('Error executing search');
        }

        var hits = results.hits;
        var hits_found = [];

        _.each(results.hits.hits, function (doc) {
          hits_found.push(doc._source.snippet_id);
        });

        var hit_id = SearchResults.insert({
          hits : hits_found
        });

        Session.set('hit_id', hit_id);

        Meteor.Router.to('/search');

      }

      var r = ejs.Request()
      .indices('snippets')
      .types('snippet')
      .query(ejs.QueryStringQuery(qstr));

      r.doSearch(resultsCallBack);
    }

  });

}

if (Meteor.isServer) {

  Meteor.startup(function () {
  });

  Meteor.publish("Snippets", function () {
    return Snippets.find({});
  });

  Meteor.publish("SearchResults", getHits);

  var require = __meteor_bootstrap__.require;

  var ejs = require('elastic.js'),
    nc = require('elastic.js/elastic-node-client');

  ejs.client = nc.NodeClient('localhost', '9200');

  Snippets.find().observe({
    added: function(id) {
      var doc = ejs.Document('snippets', 'snippet', id._id).source({
        snippet_id: id._id,
        raw:  id.raw,
        language: id.language
      }).doIndex();
    }
  });

}
