$(function() {

  window.gap = {



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


          tx.executeSql(sql, [], function(tx, results) {

            results.rows.length > 0 ? user = results.rows.item(0) : user = {};

            callback(user);

          },
          function(err) {
            console.log("getUser error" + err.code);
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

          var sql = 'INSERT INTO user(login, pass, host) VALUES("' + login + '", "' + hashedPass + '", "' + host + '")';

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
      console.log(err.code + '  ' + err.message);
      app.errorAlert("There was an error. Please try again");
    }


  };



  window.auth = {
    route: "login",
    inProgress: false,

    login: function(callback) {

      auth.inProgress = true;
            //route reset
            auth.route = "login";

            this.loginCallback = callback;

            gap.getUser(function(user) {


              if (_.isEmpty(user)) {
                auth.loginCallback();
                auth.inProgress = false;
                return;
              }



              var req = {
                userName: user.login
              };

              try {
                $.ajax({
                  url: 'http://' + user.host + '/resources/Security/Authentication.json',
                  type: 'POST',
                  data: req,
                  dataType: "json",
                  crossDomain: true,
                  cache: false,
                  success: function(data) {

                    console.log(JSON.stringify(data));
                    app.session.set("token", data.Token);
                    app.session.set("host", user.host);
                    auth.authorize(user, function() {


                                // if there is id of blog assigned - go to entriesList. Otherwise let the user select a Blog
                                if (!app.session.get("blog")) {
                                  auth.route = "blogsList";
                                } else {
                                  auth.route = "entriesList";
                                }

                                if (!app.session.get("userId")) auth.route = "login";
                                auth.loginCallback();
                                auth.inProgress = false;
                              });



                  },
                  error: function(jqXHR, textStatus, errorThrown) {
                    console.log("login fail");

                    auth.inProgress = false;

                    auth.loginCallback();

                  }
                });
} catch (err) {

  console.log(err);
  auth.loginCallback();
}


});


},

authorize: function(user, callback) {

  var token = app.session.get("token");

  shaPassword = user.pass;
  shaStep1 = new jsSHA(shaPassword, "ASCII");
  shaStep2 = new jsSHA(token, "ASCII");
  hash = shaStep1.getHMAC(user.login, "ASCII", "SHA-512", "HEX");
  hash = shaStep2.getHMAC(hash, "ASCII", "SHA-512", "HEX");

  var req = {
    Token: token,
    HashedToken: hash,
    UserName: user.login
  };


  this.authorizeCallback = callback;




  try {
    $.ajax({
      url: 'http://' + user.host + '/resources/Security/Authentication/Login.json',
      type: 'POST',
      data: req,
      crossDomain: true,
      cache: false,
      dataType: 'json',
      success: function(data) {
        console.log("auth success");
        app.session.set("userId", data.User.Id);
        app.session.set("session", data.Session);
        auth.checkRole();
        auth.inProgress = false;
        auth.authorizeCallback();

      },
      error: function(jqXHR, textStatus, errorThrown, callback) {



        console.log("auth fail: " + jqXHR.responseText);
        auth.inProgress = false;
        auth.authorizeCallback();

      }
    });
  } catch (err) {
    console.log(err);
    auth.inProgress = false;
    auth.authorizeCallback();
  }



},

checkRole: function() {

  var adminRoleId = null;

  try {
    $.ajax({
      url: 'http://' + app.session.get("host") + '/resources/RBAC/Role.json?X-Filter=Name,Id',
      type: 'GET',
      crossDomain: true,
      dataType: 'json',
      success: function(data) {


        $.each(data.RoleList, function() {
                            //finds Id of administrator Role
                            if (this.Name == 'Administrator') adminRoleId = this.Id;

                          });

        try {
          $.ajax({
            url: 'http://' + app.session.get("host") + '/resources/HR/User/' + app.session.get("userId") + '/Role.json?X-filter=Id',
            type: 'GET',
            crossDomain: true,
            dataType: 'json',
            success: function(data) {


              $.each(data.RoleList, function() {
                                        //user is an admin
                                        if (this.Id == adminRoleId) app.session.set("isAdmin", true);

                                      });




            },
            error: function(jqXHR, textStatus, errorThrown, callback) {



              console.log("roleCheck fail: " + jqXHR.responseText);


            }
          });
        } catch (err) {
          console.log(err);

        }




      },
      error: function(jqXHR, textStatus, errorThrown, callback) {



        console.log("roleCheck fail: " + jqXHR.responseText);


      }
    });
} catch (err) {
  console.log(err);

}
},

logout: function() {
  gap.deleteUser(function() {
    app.session.clear();
    app.blogsCollection.reset();
    app.blogsListView = undefined;

    app.snapper.close();
    app.router.navigate("someDeadRoute");
    app.router.navigate("login", {
      trigger: true
    });
  });
}

};


window.app = {

  router: new window.Router,
  session: new window.SessionModel,
  blogsCollection: new window.blogsCollection,
  loginView: new window.LoginView,
  hasConnection: true,

        //loginDelayedFunction is used in onlineEventHandler. Sometimes it fires two times: when it gets 3g connection and then wifi
        loginDelayedFunction: null,



        errorAlert: function(text, header) {
          $("#overlay").css("display", "block");
          if (header) {
            $("#errorAlert h2").html(header);
          } else {
            $("#errorAlert h2").html("Error");
          }
          $("#errorAlert p").html(text);

          $("#errorAlert").css("display", "block");

          setTimeout(function() {
            $("#overlay").fadeOut();
            $("#errorAlert").fadeOut();

          }, 2000);

        },

        successAlert: function(text, header) {
          $("#overlay").css("display", "block");
          if (header) {
            $("#successAlert h2").html(header);
          } else {
            $("#successAlert h2").html("Success");
          }
          $("#successAlert p").html(text);

          $("#successAlert").css("display", "block");

          setTimeout(function() {
            $("#overlay").fadeOut();
            $("#successAlert").fadeOut();

          }, 2000);

        },

        onlineEventHandler: function() {
          app.hasConnection = true;

          clearTimeout(app.loginDelayedFunction);
          app.loginDelayedFunction = _.delay(function() {

            if (!auth.inProgress) {
              auth.login(function() {
                console.log("onlineeventhandler auth callback fired");

              });
            }
          }, 2000);


        },

        offlineEventHandler: function() {
          app.hasConnection = false;
          app.errorAlert("You don't have an internet connection");
        },



        backButtonHandler : function(e){
          console.log("####################");
          var place = Backbone.history.getFragment();

          console.log(place);


            if(!place){
                e.preventDefault();
                navigator.app.exitApp();
            }
            else {
                window.history.back();
            }


        },


        init: function() {
          console.log("app init");



          document.addEventListener("online", app.onlineEventHandler, false);

          document.addEventListener("offline", app.offlineEventHandler, false);

          document.addEventListener("resume", app.onlineEventHandler, false);

          document.addEventListener("backbutton", app.backButtonHandler, false);


          new FastClick(document.body);




          app.snapper = new Snap({
            element: document.getElementById('content'),
            disable: 'right'
          });


          $(".toggle-left").bind('click', function() {

            app.snapper.state().state == "left" ? app.snapper.close() : app.snapper.open('left');
          });

          $("#logout_button").bind("click", auth.logout);

          gap.initialize(function() {

            auth.login(function() {

              console.log("auth.route: " + auth.route);
              Backbone.history.start();
              app.router.navigate("someDeadRoute");

              app.router.navigate(auth.route, {
                trigger: true
              });


            });
          });

        }

      };



      if (window.cordova !== undefined) {
        app.init();
      } else {
        document.addEventListener("deviceready", app.init, false);



      }



    });