

$(function() {

	window.Router = Backbone.Router.extend({
		routes: {
		    "": "login",
		    "blogsList": "blogsList",
		    "login":"login",
		    "entriesList": "entriesList",
		    "newPost" : "newPost"
		},
		entriesList: function() {
			console.log("entriesList router");
			if (typeof app.entriesListView === 'object'){
				clearTimeout(app.entriesListView.timer);
				app.entriesListView.unbind();
				delete app.entriesListView;
			}
			app.entriesListView = new window.entriesListView();

		},

		login: function(){
			console.log("login router");

			app.loginView.render();
		},

		blogsList: function(){
			console.log("blogsList router");
			if (app.menuBlogsListView == undefined) app.menuBlogsListView = new window.menuBlogsListView;

			if (app.blogsListView == undefined) app.blogsListView = new window.blogsListView;
			app.blogsListView.render();



		},

		newPost: function () {
			console.log("#############################newPost router");

			if (typeof app.newPostView === 'object'){
				app.newPostView.unbind();
				delete app.newPostView;
			}
			app.newPostView = new window.newPostView();
			app.newPostView.render();


		}

	});






});