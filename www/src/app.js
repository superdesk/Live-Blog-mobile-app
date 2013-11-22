$(function() {

  window.gap =  {



   initialize: function(callback) {
    console.log("gap initialize inside");
    var self = this;
    var _callback = callback;

    this.db = window.openDatabase("mobileLiveBlog", "1.0", "mobile Live Blog", 1 * 1024 * 1024);


    this.createTables(_callback);




  },

  createTables: function(callback) {
    var _callback = callback;

    this.db.transaction(
     function(tx) {

       tx.executeSql('CREATE TABLE IF NOT EXISTS user(login VARCHAR(250), pass VARCHAR(500), host VARCHAR(1000))');

       _callback();

     },

     this.txErrorHandler
     );
  },


  getUser: function(callback) {


    var user = {};
    this.db.transaction(
     function(tx) {
       var sql = 'SELECT * FROM user LIMIT 1';


       tx.executeSql(sql, [], function (tx,results) {

        results.rows.length > 0 ? user = results.rows.item(0) : user = {};

        callback(user);

      },
      function(err) {
        console.log("getUser error"+err.code);
        user = {};
        callback(user);
      }
      );
     }, this.txErrorHandler
     );

  },

  addUser: function(login, pass, host) {
   this.db.transaction(
     function(tx) {
       var sql = "DELETE FROM user";


       tx.executeSql(sql);

     },
     this.txErrorHandler
     );

   this.db.transaction(
     function(tx) {
      var hash = new jsSHA(pass, "ASCII");
      var hashedPass = hash.getHash("SHA-512", "HEX");

      var sql = 'INSERT INTO user(login, pass, host) VALUES("'+login+'", "'+hashedPass+'", "'+host+'")';

      tx.executeSql(sql);
    },
    this.txErrorHandler
    );

 },




 deleteUser: function(callback) {


   this.db.transaction(
     function(tx) {
       var sql = 'DELETE FROM user';

       tx.executeSql(sql,
         this.txErrorHandler,

         function(tx, results) {
           callback();
         });
     },
     this.txErrorHandler
     );

 },




 txErrorHandler: function(err) {
  console.log(err.code+'  '+err.message);
  app.errorAlert("There was an error. Please try again");
}


};



window.auth = {
 route: "login",

 login: function(callback){

      //route reset
      auth.route = "login";

      this.loginCallback = callback;

      gap.getUser(function(user){



        if(_.isEmpty(user)){

          auth.loginCallback();
          return;
        }



        var req = { userName: user.login  };

        try{
          $.ajax({
            url: 'http://'+user.host+'/resources/Security/Authentication.json',
            type: 'POST',
            data: req,
            dataType: "json",
            crossDomain: true,
            cache:false,
            success: function(data) {

              console.log(JSON.stringify(data));
              app.session.set("token", data.Token);
              app.session.set("host", user.host);
              auth.authorize(user, function(){


                    // if there is id of blog assigned - go to entriesList. Otherwise let the user select a Blog
                    if(!app.session.get("blog")){
                      auth.route = "blogsList";
                    }else{
                      auth.route = "entriesList";
                    }

                    if(!app.session.get("userId")) auth.route = "login";
                    auth.loginCallback();
                  });



            },
            error: function(jqXHR, textStatus, errorThrown) {
              console.log("login fail");



              auth.loginCallback();

            }
          });
}
catch(err){

  console.log(err);
  auth.loginCallback();
}


});


},

authorize: function(user, callback){

  var token = app.session.get("token");

  shaPassword = user.pass;
  shaStep1 = new jsSHA(shaPassword, "ASCII");
  shaStep2 = new jsSHA(token, "ASCII");
  hash = shaStep1.getHMAC(user.login, "ASCII", "SHA-512", "HEX");
  hash = shaStep2.getHMAC(hash, "ASCII", "SHA-512", "HEX");

  var req = { Token: token, HashedToken: hash , UserName: user.login };


  this.authorizeCallback = callback;




  try{
    $.ajax({
      url: 'http://'+user.host+'/resources/Security/Authentication/Login.json',
      type: 'POST',
      data: req,
      crossDomain: true,
      cache:false,
      dataType: 'json',
      success: function(data) {
        console.log("auth success");
        app.session.set("userId", data.User.Id);
        app.session.set("session", data.Session);
       // auth.checkRole();
        auth.authorizeCallback();

      },
      error: function(jqXHR, textStatus, errorThrown, callback) {



       console.log("auth fail: "+jqXHR.responseText);
       auth.authorizeCallback();

     }
   });
  }
  catch(err){
    console.log(err);
    auth.authorizeCallback();
  }



},

checkRole : function(){
  console.log('http://'+app.session.get("host")+'/resources/HR/User/'+app.session.get("userId")+'/Role.json?X-filter=Id');

  try{
    $.ajax({
      url: 'http://'+app.session.get("host")+'/resources/HR/User/'+app.session.get("userId")+'/Role.json?X-filter=Id',
      type: 'GET',
      crossDomain: true,
      dataType: 'json',
      success: function(data) {


        $.each(data.RoleList, function() {
            console.log("id: "+this.Id);
        });

        // console.log("user is an admin");
        // app.session.set("userId", data.User.Id);


      },
      error: function(jqXHR, textStatus, errorThrown, callback) {



       console.log("roleCheck fail: "+jqXHR.responseText);


     }
   });
  }
  catch(err){
    console.log(err);

  }
},

logout : function(){
  gap.deleteUser(function(){
    app.session.clear();
    app.blogsCollection.reset();
    app.blogsListView = undefined;

    app.snapper.close();
    app.router.navigate("someDeadRoute");
    app.router.navigate("login", {trigger: true});
  });
}

};


window.app = {

  router : new window.Router,
  session : new window.SessionModel,
  blogsCollection : new window.blogsCollection,
  loginView : new window.LoginView,
  hasConnection : true,

  //loginDelayedFunction is used in onlineEventHandler. Sometimes it fires two times: when it gets 3g connection and then wifi
  loginDelayedFunction : null,



  errorAlert : function (text, header) {
    $("#overlay").css("display", "block");
    if(header){
      $("#errorAlert h2").html(header);
    }else{
      $("#errorAlert h2").html("Error");
    }
    $("#errorAlert p").html(text);

    $("#errorAlert").css("display", "block");

    setTimeout(function(){
      $("#overlay").fadeOut();
      $("#errorAlert").fadeOut();

    },2000);

  },

  successAlert : function (text, header) {
    $("#overlay").css("display", "block");
    if(header){
      $("#successAlert h2").html(header);
    }else{
      $("#successAlert h2").html("Success");
    }
    $("#successAlert p").html(text);

    $("#successAlert").css("display", "block");

    setTimeout(function(){
      $("#overlay").fadeOut();
      $("#successAlert").fadeOut();

    },2000);

  },

  onlineEventHandler : function () {
    app.hasConnection = true;

    clearTimeout(app.loginDelayedFunction);
    app.loginDelayedFunction = _.delay(function () {
      auth.login(function(){
        console.log("auth callback fired");

        if(auth.route!="login"){
          if(auth.route!="entriesList" || (auth.route=="entriesList" && !app.entriesListView.collection.length ) ){
            app.router.navigate("someDeadRoute");
            app.router.navigate(auth.route, {trigger: true});
          }
        }else{
          app.errorAlert("Login failed");
          app.router.navigate("someDeadRoute");
          app.router.navigate("login", {trigger: true});

        }



      });
    }, 2000);

  },

  offlineEventHandler : function () {
    app.hasConnection = false;
    app.errorAlert("You don't have an internet connection");
  },


  init : function(){
    console.log("app init");



    if (parseFloat(window.device.version) >= 7.0) {
      document.body.style.marginTop = "20px";
    }

    document.addEventListener("online", app.onlineEventHandler, false);

    document.addEventListener("offline", app.offlineEventHandler, false);

    document.addEventListener("resume", app.onlineEventHandler, false);


    new FastClick(document.body);




    app.snapper = new Snap({
      element: document.getElementById('content'),
      disable: 'right'
    });


    $(".toggle-left").bind('click', function(){

      app.snapper.state().state=="left" ? app.snapper.close() : app.snapper.open('left');
    });

    $("#logout_button").bind("click", auth.logout);

    gap.initialize(function() {

      auth.login(function(){

        console.log("auth.route: "+auth.route);
        Backbone.history.start();
        app.router.navigate("someDeadRoute");

        app.router.navigate(auth.route, {trigger: true});


      });
    });

  }

};




//app.init();
document.addEventListener("deviceready", app.init, false);



});


