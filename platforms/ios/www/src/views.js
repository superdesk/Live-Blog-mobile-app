$(function() {

	// left menu

	window.menuBlogsListItemView = Backbone.View.extend({
		template: $("#menuBlogItem_template").html(),
		model: BlogItemModel,
		tagName: "li",

		render: function () {

			this.JSONmodel = this.model.toJSON();
			var tmpl = _.template(this.template);



			$(this.el).html(tmpl(this.JSONmodel));
			return this;
		},
		events: {
			"click a":    "blogItemClick"
		},

		blogItemClick: function(e){



			app.session.set("blog", this.JSONmodel.Id);
			app.session.set("blogTitle", this.JSONmodel.Title);

			app.router.navigate("someDeadRoute");
			app.router.navigate("entriesList", {trigger: true});
			app.snapper.close();
		},


	});

	window.menuBlogsListView = Backbone.View.extend({
		el: $("#menuBlogsListView"),

		initialize: function () {

			console.log("menublogListView init");


			this.collection = app.blogsCollection;
			this.listenTo(this.collection, 'change', this.renderMenu);

			var self = this;


		},

		renderMenu: function () {
			console.log("menublogsListView render");
			navigator.splashscreen.hide();
			var that = this;
			this.$el.empty();
			_.each(this.collection.models, function (item) {
				that.renderBlogItem(item);
			}, this);

		},



		renderBlogItem: function (item) {
			var menuBlogItemView = new menuBlogsListItemView({
				model: item
			});

			this.$el.append(menuBlogItemView.render().el);
		}
	});

	///////////////////


	window.blogsListItemView = Backbone.View.extend({
		template: $("#blogItem_template").html(),
		model: BlogItemModel,
		tagName: "li",

		render: function () {

			this.JSONmodel = this.model.toJSON();
			var tmpl = _.template(this.template);

			console.log("blogItem render");

			$(this.el).html(tmpl(this.JSONmodel));
			return this;
		},
		events: {
			"click a":    "blogItemClick"
		},

		blogItemClick: function(){


			app.session.set("blog", this.JSONmodel.Id);
			app.session.set("blogTitle", this.JSONmodel.Title);

			app.router.navigate("entriesList", {trigger: true});
		},


	});

	window.blogsListView = Backbone.View.extend({
		el: $("#blogsListView"),

		initialize: function () {

			console.log("blogListView init");


			this.collection = app.blogsCollection;
		    //	this.listenTo(this.collection, 'reset', this.render);

		    var self = this;
		    this.collection.fetch().complete(function(){
		    	self.render();
		    	self.collection.trigger("change");
		    });



	        //this.render();
	    },

	    render: function () {
	    	console.log("blogsListView render");
	    	var that = this;
	    	this.$el.find('ul').empty();
	    	_.each(this.collection.models, function (item) {
	    		that.renderBlogItem(item);
	    	}, this);
	    	$("#loading").css("display", "none");
	    	$(".page").css("display", "none");
	    	this.$el.css("display", "block");
	    },



	    renderBlogItem: function (item) {
	    	var blogItemView = new blogsListItemView({
	    		model: item
	    	});

	    	this.$el.find("ul").append(blogItemView.render().el);
	    }
	});



	window.LoginView = Backbone.View.extend({

		el: '#loginView',

		render: function() {
			$(".page").css("display", "none");
			$("#loading").css("display", "none");
			console.log("loginView render");
			this.$el.css("display", "block");
		},

		events: {
			"submit":    "loginHandler"
		},

		loginHandler: function(e){
			e.preventDefault();
			$(".page").css("display", "none");
			console.log("loginView loginHandler");
			$("#loading").css("display", "block");
			var formData = this.$el.find("form").serializeObject();

			var parsedHost = formData.host.replace("http://","");
			if (parsedHost.slice(-1)=="/") parsedHost = parsedHost.slice(0,parsedHost.length - 1);

			//form validation
			if(!parsedHost || !formData.login || !formData.pass){

				app.errorAlert("Please fill all fields");

				$(".page").css("display", "none");
				this.$el.css("display", "block");

				return;

			}
			var that = this;
			gap.addUser(formData.login, formData.pass, parsedHost);
			auth.login(function(){
				console.log("auth callback fired");

				if(auth.route!="login"){
					app.router.navigate("someDeadRoute");
					app.router.navigate(auth.route, {trigger: true});
				}else{
					app.errorAlert("Login failed");
					$(".page").css("display", "none");
					that.$el.css("display", "block");
				}



			});
		}
	});



/* entries list View */

window.entriesListItemView = Backbone.View.extend({


	tagName: "li",

	initialize: function() {
		this.model.bind('change', this.update, this);
		this.model.bind('remove', this.remove, this);
	},

	twitter: {
		link: {
			anchor: function(str)
			{
				return str.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&\?\/.=]+/g, function(m)
				{
					m = m.link(m);
					m = m.replace('href="','target="_blank" href="');
					return m;
				});
			},
			user: function(str)
			{
				return str.replace(/[@]+[A-Za-z0-9-_]+/g, function(us)
				{
					var username = us.replace("@","");

					us = us.link("http://twitter.com/"+username);
					us = us.replace('href="','target="_blank" onclick="loadProfile(\''+username+'\');return(false);"  href="');
					return us;
				});
			},
			tag: function(str)
			{
				return str.replace(/[#]+[A-Za-z0-9-_]+/g, function(t)
				{
					var tag = t.replace(" #"," %23");
					t = t.link("http://summize.com/search?q="+tag);
					t = t.replace('href="','target="_blank" href="');
					return t;
				});
			},
			all: function(str)
			{
				str = this.anchor(str);
				str = this.user(str);
				str = this.tag(str);
				return str;
			}
		}
	},


	render: function () {


		try {
			var tpl = _.template($('#item-' + this.model.getClass() + '-template').html());
		} catch (err) {


			var tpl = _.template($('#item-normal-template').html());
		}

		if (this.model.isService()) {
			$(this.el).addClass(this.model.get('AuthorName')).removeClass('quote');
			var meta = jQuery.parseJSON(this.model.get('Meta'));

			if (this.model.get('AuthorName') == 'flickr') {


				this.model.set('Content', '<a class="service_content " href="http:'+meta.imageUrls.full+'"><img class="responsive" src="http:'+meta.imageUrls.full+'" /><p>'+this.model.get('Content')+'</p></a>');

			} else if (this.model.get('AuthorName') == 'twitter') {


				var user = '<figure class="authorImage"><img src="'+meta.user.profile_image_url+'" alt="Gravatar" /></figure>'+
				'<p class="attributes profile">'+meta.user.name+' ('+meta.user.screen_name+')'+
				'   <time>'+meta.created_at+'</time></p>';

				var text = '<p>'+this.twitter.link.all(this.model.get('Content'))+'</p>';

				var content = '<div class="service_content ">'+user+text+'</div>';
				this.model.set('Content', content);


			} else if (this.model.get('AuthorName') == 'facebook') {


				var user = '<figure class="authorImage"><img src="http://graph.facebook.com/'+meta.from.id+'/picture" alt="Gravatar" /></figure>'+
				'<p class="attributes profile">'+meta.from.name+
				'   <time>'+meta.formated_time+'</time></p>';

				var text = '<p>'+this.model.get('Content')+'</p>';

				var content = '<div class="service_content ">'+user+text+'</div>';
				this.model.set('Content', content);


			} else if (this.model.get('AuthorName') == 'instagram') {


				this.model.set('Content', '<div class="service_content "><img class="responsive" src="'+meta.images.low_resolution.url+'" /></div>');

			} else if (this.model.get('AuthorName') == 'youtube') {


				this.model.set('Content', '<iframe width="100%" height="200" src="http://www.youtube.com/embed/'+meta.id+'" frameborder="0" allowfullscreen></iframe>');

			} else if (this.model.get('AuthorName') == 'google') {

				this.model.set('noSource',1);

				if(meta.GsearchResultClass == 'GwebSearch'){

					this.model.set('Content', '<a class="service_content" href="'+meta.unescapedUrl+'" target="_blank"><p><strong>'+meta.titleNoFormatting+'</strong></p><p class="color_dark">'+meta.content+'</p><span class="small_caption"><img class="source-icon" src="http://g.etfv.co/'+meta.url+'" />'+meta.visibleUrl+'</span></a>');
				} else if(meta.GsearchResultClass == 'GnewsSearch'){

					var picture = '';
					if('image' in meta){
						if('tbUrl' in meta.image) picture = '<img class="news_thumbnail" src="'+meta.image.tbUrl+'" />';
					}
					this.model.set('Content', '<a class="service_content" href="'+meta.unescapedUrl+'" target="_blank"><p><strong>'+meta.titleNoFormatting+'</strong></p>'+picture+'<p class="color_dark">'+meta.content+'</p><span class="small_caption"><img class="source-icon" src="http://g.etfv.co/'+meta.unescapedUrl+'" />'+meta.publisher+'</span></a>');
				} else if(meta.GsearchResultClass == 'GimageSearch'){

					this.model.set('Content', '<a class="service_content " href="'+meta.originalContextUrl+'"><img class="responsive" src="'+meta.unescapedUrl+'" /><p class="color_dark">'+this.model.get('Content')+'</p><span class="small_caption"><img class="source-icon" src="http://g.etfv.co/'+meta.originalContextUrl+'" />'+meta.visibleUrl+'</span></a>');
				}

			} else if (this.model.get('AuthorName') == 'soundcloud') {


				this.model.set('Content', '<iframe width="100%" height="166" scrolling="no" frameborder="no" src="http://w.soundcloud.com/player/?url=http%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F'+meta.id+'&amp;auto_play=false&amp;show_artwork=true&amp;color=ff7700"></iframe>');

			}



		}





		$(this.el).html(tpl({item: this.model})).addClass(this.model.getClass());




		return this;
	}


});

window.entriesListView = Backbone.View.extend({
	el: "#entriesListView",
	isLoading: true,
	wait: 15000, // ms
	scrollPosition: 0, // 0 - top



	initialize: function () {
		var self = this;

		$(".page").css("display", "none");
		$("#loading").css("display", "block");


		console.log("##### entriesListView init");
		this.showLoadingIndicator();

		// destroy scrollable element
		$('.scrollable').remove();

		// create and add new scrollable element to DOM
		var scrollable=document.createElement("DIV");
		scrollable.className="scrollable";
		var wrap = document.createElement("DIV");
		wrap.className="wrap";
		var list = document.createElement("UL");
		list.className="list";

		wrap.appendChild(list);
		scrollable.appendChild(wrap);

		$(this.el).find("#entriesListContent").prepend(scrollable);

		// now we can init pull to refresh

		$(this.el).find('.scrollable').pullToRefresh({
			callback: function() {
				var deff = $.Deferred();

				self.prependResults(self, deff, function (deff) {
					deff.resolve();

				});


				return $.when(deff).done(function () { deff.promise(); });

			}
		});

		var blogTitle = app.session.get("blogTitle");
		if(blogTitle.length > 19){
			var cutat= blogTitle.lastIndexOf(' ',20);

			if(cutat!=-1){
				blogTitle = blogTitle.substring(0,cutat)+'...';
			}else{
				blogTitle = blogTitle.substring(0,10)+'...';
			}
		}

		this.$el.find("h1.title").html(blogTitle);




		this.collection = new window.entriesCollection();



		if(app.hasConnection){
			this.collection.fetch({reset: true}).complete(function(){
				self.collection.updateCids();

				self.renderView();

				self.isLoading = false;
				self.timer = _.delay(self.prependResults, self.wait, self);
				self.hideLoadingIndicator();
			});

		}


		_.bindAll(this, 'checkScroll');
		// allow checkScroll function to be fired not often than every 150ms
		var throttledCheckScroll = _.throttle(this.checkScroll, 150);
		$("#entriesListView .scrollable").unbind("scroll").bind("scroll", throttledCheckScroll);

		_.bindAll(this, 'newButtonClickHandler');
		$("#entriesListView #loadNewPosts").unbind("click").bind("click", this.newButtonClickHandler);





	},



	renderView: function () {
		console.log("entriesListView render");
		var that = this;

		_.each(this.collection.models, function (item) {
			that.renderItem(item,0);
		}, this);



		//this.updateAnchorClickEvent();
		$(".page").css("display", "none");


		this.$el.css("display", "block");

	},



	renderItem: function (item, prependFlag) {
		var itemView = new entriesListItemView({
			model: item
		});

		var rendered = itemView.render();



		if(prependFlag){
			$(rendered.el).prependTo(this.$el.find("ul")).hide().slideDown(1000);
			//	this.$el.find("ul").prepend(itemView.render().el);
		}else{
			$(rendered.el).appendTo(this.$el.find("ul")).hide().fadeIn(1000);
			//this.$el.find("ul").append(itemView.render().el);
		}

	},


	prependResults: function (that, deff, callback) {

		console.log("prependResults");

		if(!that.isLoading && app.hasConnection){

			that.isLoading = true;

			that.collection.loadDirection="new";

			that.collection.fetch({
				reset: true,
				complete: function (item) {
					if(that.collection.length){
						// check if scroll is on top

						if(that.scrollPosition - 10 < 0){
							that.prependResultsRender();
						} else {
							that.showNewButton();
						}
					}


					that.isLoading = false;
					//that.timer = _.delay(that.prependResults, that.wait, that);
					if(_.isFunction(callback)) callback(deff);

				},
				error : function () {

					that.isLoading = false;
					//that.timer = _.delay(that.prependResults, that.wait, that);
					if(_.isFunction(callback)) callback(deff);
				}
			});
		}else{

			if(_.isFunction(callback)) callback(deff);
		}

		clearTimeout(that.timer);
		that.timer = _.delay(that.prependResults, that.wait, that);
		return true;

	},

	prependResultsRender : function (callback) {
		_.each(this.collection.models, function (item) {
			this.renderItem(item, 1);
		}, this);

		//this.updateAnchorClickEvent();
		this.collection.updateCids();
		return true;
	},


	appendResults: function () {

		if( !this.collection.listEnd){
			var that = this;

			this.isLoading = true;
			this.showLoadingIndicator();
			this.collection.loadDirection="more";

			this.collection.fetch({
				reset: true,
				complete: function (item) {

					_.each(that.collection.models, function (item) {
						that.renderItem(item, 0);
					}, that);

					//that.updateAnchorClickEvent();
					that.collection.updateCids();
					that.hideLoadingIndicator();
					that.isLoading = false;

				},
				error : function () {
					that.hideLoadingIndicator();
					that.isLoading = false;

				}
			});
		}

	},

	// shows loading indicator on appendResults
	showLoadingIndicator : function (){
		$(this.el).find("#appendLoadingIndicator").fadeIn();
	},

	hideLoadingIndicator : function () {
		$(this.el).find("#appendLoadingIndicator").fadeOut();
	},


	showNewButton : function () {

		var button = $(this.el).find("#loadNewPosts");
		button.find(".postsnumber").html(this.collection.length);
		button.slideDown();

	},

	newButtonClickHandler: function () {
		$(this.el).find("#loadNewPosts").slideUp();
		$("#entriesListView .scrollable").animate({ scrollTop: 0 }, "slow");
		this.prependResultsRender();


	},

	checkScroll: function () {

		var triggerPoint = 100;
		var target = $("#entriesListView .scrollable");
		var scrollY = target.scrollTop() + target.height();
		var docHeight = target.get(0).scrollHeight;


		this.scrollPosition = target.scrollTop();



		if( !this.isLoading && scrollY > docHeight - triggerPoint && app.hasConnection ) {

			this.appendResults();

		}
	}




});


window.newPostView = Backbone.View.extend({
	el: "#newPost",
	localImageURI : false,
	serverImageURI : false,
	submitDisabled : false,


	initialize : function () {

		this.collection = new window.postTypesCollection();


		var that = this;



		_.bindAll(this, 'selectHandler');
		this.$el.find("#postTypeSelect").unbind("change").bind("change", this.selectHandler);

		_.bindAll(this, 'submitHandler');
		this.$el.find("#newPostForm").unbind("submit").bind("submit", this.submitHandler);

		_.bindAll(this, 'submitForm');

		_.bindAll(this, 'cameraClickHandler');
		this.$el.find("#takeAShot").unbind("click").bind("click", this.cameraClickHandler);

		_.bindAll(this, 'addFromLibraryClickHandler');
		this.$el.find("#addFromLibrary").unbind("click").bind("click", this.addFromLibraryClickHandler);

		_.bindAll(this, 'deletePhoto');
		this.$el.find("#photoPreview").unbind("click").bind("click", this.deletePhoto);

		_.bindAll(this, 'cameraSuccess');
		_.bindAll(this, 'uploadPhoto');
		_.bindAll(this, 'uploadPhotoFail');
		_.bindAll(this, 'uploadPhotoSuccess');






	},




	renderType : function (item) {
		var typeOption = '<option class="rendered" value="'+item.get('Type').Key+'" data-content="'+escape(item.get('Content'))+'">'+item.get('Name')+'</option>';
		this.$el.find("#postTypeSelect").append(typeOption);

	},

	render: function () {
		console.log("postTypeRender");
		//clear list of post types
		$(this.el).find("#postTypeSelect .rendered").remove();

		var that = this;
		this.collection.fetch({reset: true}).complete(function(){


			_.each(that.collection.models, function (item) {
				that.renderType(item);
			}, that);



		});

		return this;
	},

	selectHandler : function (e) {
		var content = unescape($(e.target).find('option:selected').data('content'));
		console.log(content);
		if( content != 'undefined'){
			this.$el.find("#postMessage").val(content);
		}

	},

	submitHandler : function (e) {
		e.preventDefault();

		if(app.hasConnection && !this.submitDisabled){

			this.showLoading();
			if(this.localImageURI){
				this.uploadPhoto();
			}else{
				this.submitForm();
			}

		}

	},

	showLoading : function () {
		var button = $(this.el).find("#newPostForm button");
		button.html("");
		button.addClass("loading");
		this.submitDisabled = true;

	},

	hideLoading : function () {

		var button = $(this.el).find("#newPostForm button");
		button.html("Submit Post");
		button.removeClass("loading");
		this.submitDisabled = false;

	},

	clearForm : function () {
		this.$el.find("#postMessage").val("");
		this.localImageURI = false;
		this.serverImageURI = false;


		var imageConteiner = $("#photoPreview");
		var image = $("#photoPreview img");

		imageConteiner.fadeOut( "fast", function() {
			image.attr("src", '');
			$(".add_photo").fadeIn();
		});
		return true;
	},

	submitForm : function () {
		var type = this.$el.find("#postTypeSelect").val();
		var message = this.$el.find("#postMessage").val();

		if(message.length < 3 && !this.serverImageURI){
			app.errorAlert("Please write a message");
			this.hideLoading();
			return false;
		}
		var photo ='';
		if(this.serverImageURI) photo = '<img src="'+this.serverImageURI+'" />';

		var req = { Meta : { }, Content: photo + message, Type: type, Creator: app.session.get("userId") };

		var that = this;
		try{
			$.ajax({
				url: 'http://'+app.session.get("host")+'/resources/my/LiveDesk/Blog/'+app.session.get("blog")+'/Post.json',
				type: 'POST',
				data: req,
				dataType: "json",
				beforeSend : function(xhr) {
					// set header
					xhr.setRequestHeader("Authorization", app.session.get("session"));
				},

				success: function(data) {
					that.hideLoading();
					that.clearForm();

					app.successAlert("Your post has been sent and waits for approval.","Post sent");

					console.log("submit success");

				},
				error: function(jqXHR, textStatus, errorThrown, callback) {
					that.hideLoading();
					app.errorAlert("Something went wrong. Try again");
					console.log(errorThrown+' '+textStatus);
				}
			});
		}
		catch(err){
			console.log(err);
			app.errorAlert("Something went wrong. Try again");
			this.hideLoading();
		}

	},

	addFromLibraryClickHandler : function () {

		navigator.camera.getPicture(this.cameraSuccess, this.cameraFail,
		{
			quality: 75,
			correctOrientation: true,
			destinationType: Camera.DestinationType.FILE_URI,
			saveToPhotoAlbum: false,
			sourceType : Camera.PictureSourceType.PHOTOLIBRARY,
			encodingType: Camera.EncodingType.JPEG,
			targetWidth: 600,
			targetHeight: 600
		}
		);

	},

	cameraClickHandler: function () {

		navigator.camera.getPicture(this.cameraSuccess, this.cameraFail,
		{
			quality: 75,
			correctOrientation: true,
			destinationType: Camera.DestinationType.FILE_URI,
			saveToPhotoAlbum: true,
			sourceType : Camera.PictureSourceType.CAMERA,
			encodingType: Camera.EncodingType.JPEG,
			targetWidth: 600,
			targetHeight: 600
		}
		);

	},

	cameraSuccess : function(imageURI) {
		var imageConteiner = $("#photoPreview");
		var image = $("#photoPreview img");
		image.attr("src",imageURI);
		this.localImageURI = imageURI;

		$(".add_photo").fadeOut( "fast", function() {
			imageConteiner.fadeIn();
		});



	},

	deletePhoto : function(imageURI) {
		var imageConteiner = $("#photoPreview");
		var image = $("#photoPreview img");

		this.localImageURI = false;

		imageConteiner.fadeOut( "fast", function() {
			image.attr("src", '');
			$(".add_photo").fadeIn();
		});



	},

	cameraFail : function(message) {
		console.log(message);
	},


	uploadPhoto : function () {
		var options = new FileUploadOptions();
		options.fileKey="file";
		options.fileName=this.localImageURI.substr(this.localImageURI.lastIndexOf('/')+1);
		options.mimeType="image/jpeg";

		var params = {};

		options.params = params;

		var uploadURL = 'http://'+app.session.get("host")+'/resources/my/HR/User/'+app.session.get("userId")+'/MetaData/Upload.json?X-Filter=*&Authorization='+ app.session.get("session");

		var ft = new FileTransfer();
		var that= this;
		ft.upload(this.localImageURI, encodeURI(uploadURL), that.uploadPhotoSuccess, that.uploadPhotoFail, options);
	},

	uploadPhotoSuccess : function (r) {
		console.log("Code = " + r.responseCode);
		console.log("Response = " + r.response);
		console.log("Sent = " + r.bytesSent);
		this.serverImageURI = JSON.parse(r.response).Content.href;
		this.submitForm();
	},

	uploadPhotoFail : function (error) {
		app.errorAlert("An error has occurred. Please try again.");
		this.hideLoading();
		console.log("upload error source " + error.source);
		console.log("upload error target " + error.target);
	}




});


});


