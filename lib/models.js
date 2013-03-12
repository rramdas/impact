Snippets = new Meteor.Collection('snippets'); 
SearchResults = new Meteor.Collection('search_results');

Snippets.allow({
  insert: function (userId, snippet) {
    return userId && snippet.owner === userId;
  }
});

SearchResults.allow({
  insert: function(userId, search) {
    return userId && search.owner === userId;
  }
});