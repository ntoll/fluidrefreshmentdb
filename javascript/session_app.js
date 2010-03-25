/*
 * session_app - a generic javascript application for logging a user in/out
 * and tracking their session.
 *
 * (c) 2009 Nicholas H.Tollervey (http://ntoll.org/contact)
 *
 * Based upon the Sammy javascript framework: http://code.quirkey.com/sammy/
 *
 * and
 *
 * jsFluidDB: http://github.com/ecarnevale/jsFluidDB
 */
(function($) {

    var COOKIE_AUTH_TOKEN = 'fluiddb_auth';
    var COOKIE_USERNAME = 'fluiddb_username';

    var session_app = $.sammy(function() {
        // the element_selector puts this application in the context of the
        // session element
        element_selector = '#session';
        this.use(Sammy.Mustache, 'ms');
        this.use(Sammy.Storage);

        // initialise the store
        this.store('fluidrefreshmentdb', {type: 'cookie'})

        /**********************************************************************
         *
         * Routes
         *
         *********************************************************************/
        
        /*
         * Logout the user by null-ing the cookies that identify them
         */
        this.post('#/logout', function(context) {
            this.store('fluidrefreshmentdb').clear(COOKIE_AUTH_TOKEN);
            this.store('fluidrefreshmentdb').clear(COOKIE_USERNAME);
            context.partial('templates/login.ms', null, function(rendered) { $('#session').replaceWith(rendered)});
        });

        /*
         * Login the user by storing away their username and the string used for
         * the basic authorization header into a couple of cookies.
         */
        this.post('#/login', function(context) {
            // extracting the username and password from the form (passed in
            // via the params dictionary).
            var username = context['params']['username'];
            var password = context['params']['password'];
            // Basic validation
            if (username.length > 0 && password.length > 0) {
                var auth = "Basic "+$.base64Encode(username+':'+password);
                this.fluidrefreshmentdb(COOKIE_AUTH_TOKEN, auth);
                this.fluidrefreshmentdb(COOKIE_USERNAME, username);
                context.username = username
                context.partial('templates/logout.ms', { username: context.username}, function(rendered) { $('#session').replaceWith(rendered);});
            } else {
                // oops...
                alert('You must enter a username and password');
            }
        });

        /*
         * This path will always match. Its function is to set the appropriate
         * session state indicator ("Logged in as: foo" or a login form) in the
         * menu bar of every page.
         */
        this.get(/(.*)/, function(context) {
            if (this.fluidrefreshmentdb(COOKIE_AUTH_TOKEN)) {
                context.partial('templates/logout.ms', { username: context.username}, function(rendered) { $('#session').replaceWith(rendered);});
            } else {
                context.partial('templates/login.ms', null, function(rendered) { $('#session').replaceWith(rendered)});
            }
        });

    });

    $(function() {
        session_app.run();
    });
})(jQuery);
