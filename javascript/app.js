/*
 * (c) 2010 Nicholas H.Tollervey (http://ntoll.org/contact)
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

    var app = $.sammy(function() {
        // the element_selector puts this application in the context of the
        // session element
        element_selector = '#container';
        this.use(Sammy.Mustache, 'ms');
        this.use(Sammy.Storage);

        // initialise the store
        this.store('fluidrefreshmentdb', {type: 'cookie'})

        // Some variables global to this application but private to it
        var map; // the map element
        var pb = new progressBar(); // the progress bar within the map

        /**********************************************************************
         *
         * Helper functions
         *
         *********************************************************************/

        /*
         * Sets up the appropriate anchor element to be a trigger for a jQuery
         * modal dialog containing the login form and creates the dialog using
         * the div with id login_dialog
         */
        function initialise_login() {
            $('#login_dialog').dialog({
                autoOpen: false,
                resizable: false,
                modal: true
            });
            $('#login_link').click(function() {
                $('#login_dialog').dialog('open');        
            });
            $('#close_link').click(function() {
                $('#login_dialog').dialog('close');
            });
        }

        /* 
         * Given a longitude and latitude will return an object with max_long,
         * max_lat, min_long, min_lat at appropriate values to allow you to
         * place the original arguments in the middle of a box of "distance" 
         * miles size
         */
        function near_to(longitude, latitude, distance) {
            // heh... as longitude per mile changes depending on your latitude
            // (the lines of latitude are closer at the poles) apparently, this 
            // will work out the correct offset of longitude given your latitude
            var long_offset = distance/(69.172 * Math.cos(latitude*0.0174533));
            // 69 miles per degree of latitude
            var lat_offset = distance/69;
            var result = {};
            result.max_long = longitude + long_offset;
            result.min_long = longitude - long_offset;
            result.max_lat = latitude + lat_offset;
            result.min_lat = latitude - lat_offset;
            return result;
        }

        /*
         * Attempts to determine the user's location through the W3C
         * navigator.geolocation property. Based upon the example found here:
         *
         * http://code.google.com/apis/maps/documentation/v3/basics.html
         *
         */
        function initialise_map() {
            $('#working').show();
            feedback("Getting your location...");
            if(navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(position) {
                        my_location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                        map.setCenter(my_location);
                        map.setZoom(11);
                        feedback("Found you! Getting local pubs");
                        get_pubs_near(my_location.lat(), my_location.lng(), 5);
                    }); 
            } else if (google.gears) {
                var geo = google.gears.factory.create('beta.geolocation');
                geo.getCurrentPosition(function(position) {
                        my_location = new google.maps.LatLng(position.latitude, position.longitude);
                        map.setCenter(my_location);
                        map.setZoom(11);
                        feedback("Found you! Getting local pubs");
                        get_pubs_near(my_location.lat(), my_location.lng(), 5);
                    });
            } else {
                $('#working').hide();
            }
        }

        /*
         * Given a latitude and longitude will attempt to find pubs within a
         * "distance" mile box with the source point in the middle.
         *
         * Adds the resulting matches to the map and uses the progress bar to
         * give feedback.
         */
        function get_pubs_near(lat, lng, distance) {
            boundry = near_to(lng, lat, distance)
            query = 'has geo/source/osm/amenity/pub and geo/latitude>'+boundry.min_lat+' and geo/latitude<'+boundry.max_lat+' and geo/longitude>'+boundry.min_long+' and geo/longitude<'+boundry.max_long
            safe_query = escape(query);
            fluidDB.get('objects?query='+safe_query, function(data){get_objects(data);}, true);
        }

        /*
         * Given a place name will search for objects that have a
         * longitude/latitude and /geo/source/geonet/feature_classification
         * value of "P" (for populated place).
         *
         * Will call the passed in function for each result returned.
         */
        function get_place_called(name, result_function) {
            search = 'has geo/longitude and has geo/latitude and geo/name="'+name+'" and geo/source/geonet/feature_classification="P"';
            safe_search=escape(search);
            fluidDB.get('objects?query='+safe_search, function(data){search_results(data, context, distance);}, true);
        }

        /*
         * Given a FluidDB username will find a list of all the pubs the
         * referenced user has visited *or* commented upon.
         *
         * Adds resulting matches to the map and uses the progress bar to give
         * feedback. Will alert() the user if no username matches or no pubs
         * are returned.
         */
        function get_pubs_referenced_by(username) {
        }

        /*
         * Will find a list of all the pubs with *exactly* the same name as
         * that passed in (unfortunately, text search isn't yet enabled in
         * FluidDB - it's on the way). 
         *
         * Adds resulting matches to the map and uses the progress bar to give
         * feedback. Will alert() the user if no matches are found.
         */
        function get_pubs_called(name) {
            map.setCenter(new google.maps.LatLng(55.0, -5.317383));
            map.setZoom(5);
            feedback("Searching for pub...");
            search = 'has geo/longitude and has geo/latitude and geo/name="'+name+'"';
            safe_search=escape(search);
            fluidDB.get('objects?query='+safe_search, function(data){get_objects(data);}, true);
        }

        /*
         * Given a JSON result containing a set of object ids that represent
         * pubs this function gets the appropriate data from FluidDB and
         * populates the map with the correct points and makes use of teh
         * progress bar for feedback
         */
        function get_objects(data) {
            if (data.ids.length>0) {
                feedback("Processing results...");
                pb.start(data.ids.length);
                $.each(data.ids, function(index, object_id) {
                    tag_list = [ '/geo/name', '/geo/longitude', '/geo/latitude']//, '/geo/source/osm/amenity/features/cuisine', '/geo/source/osm/amenity/features/food', '/geo/source/osm/amenity/features/real_ale' ]
                    results = {}
                    query_object(object_id, tag_list, results, display_object);
                });
            } else {
                alert('No results found!');
                $('#working').hide();
            }
        }

        /*
         * Given an object id, array of tags to query, results dictionary and
         * callback function will recursively query each tag in the tag_list
         * against the object id, adding the result to the results dictionary
         * and stopping when the tag_list is empty by passing the results to
         * the callback function
         */
        function query_object(object_id, tag_list, results, callback) {
            var tag = tag_list.pop();
            if(tag){
                fluidDB.get('objects/'+object_id+tag, function(data){results[tag]=data; query_object(object_id, tag_list, results, callback);}, true);
            } else {
                callback(results);
            }
        }

        /*
         * Will display the results of an object query and update the progress
         * bar. Used as the callback for the query_object function.
         */
        function display_object(result) {
            pb.updateBar(1); // pb = progress bar
            // simply extract the attributes from the results object and
            // create a marker
            var name = result['/geo/name'];
            var lng = parseFloat(result['/geo/longitude']);
            var lat = parseFloat(result['/geo/latitude']);
            var cuisine = result['/geo/source/osm/amenity/features/cuisine'];
            var food = result['/geo/source/osm/amenity/features/food'];
            var real_ale = result['/geo/source/osm/amenity/features/real_ale'];
            
            var loc = new google.maps.LatLng(lat, lng);
            var marker = new google.maps.Marker({
                position: loc,
                map: map
            });
            marker.setTitle(name);
            var infowindow = new google.maps.InfoWindow({
                content: "<p><strong>"+name+"</strong></p>",
                size: new google.maps.Size(50, 50)
            });
            google.maps.event.addListener(marker, 'click', function() {
                infowindow.open(map, marker);
            });
            // are we there yet..?
            if(pb.getCurrent() == pb.getTotal()){
                pb.hide();
                $('#working').hide();
            }
        }

        /*
         * Checks if the user is logged in and displays the appropriate
         * element on the UI.
         */
        function session_status(app) {
            if (app.fluidrefreshmentdb(COOKIE_AUTH_TOKEN)) {
                $('#username').html(app.fluidrefreshmentdb(COOKIE_USERNAME));
                $('#logout').show();
                $('#login').hide();
            } else {
                $('#logout').hide();
                $('#login').show();
            }
        }

        function feedback(msg) {
            var element = $('#status');
            element.html(msg);
            element.effect("highlight", {}, 500);
        }

        /**********************************************************************
         *
         * Routes
         *
         *********************************************************************/

        /*
         * Search FluidDB for pubs by name/location/person who has referenced it.
         */
        this.post('#/search', function(context) {
            $('#working').show();
            var search_for = context['params']['search_for']
            var search_type = context['params']['search_type']
            if (search_type == 'pub') {
                get_pubs_called(search_for);
            } else if (search_type == 'near') {
                
            } else if (search_type == 'visited') {
                get_pubs_referenced_by(search_term);
            }
        });
        
        /*
         * Logout the user by null-ing the store/database values that identify them
         */
        this.post('#/logout', function(context) {
            this.store('fluidrefreshmentdb').clear(COOKIE_AUTH_TOKEN);
            this.store('fluidrefreshmentdb').clear(COOKIE_USERNAME);
            session_status(this);
        });

        /*
         * Login the user by storing away their username and the string used for
         * the basic authorization header into a store/database.
         */
        this.post('#/login', function(context) {
            // extracting the username and password from the form (passed in
            // via the params dictionary).
            $('#login_dialog').dialog('close');
            var username = context['params']['username'];
            var password = context['params']['password'];
            // Basic "server side" validation :-)
            // The dialog also does some validation too
            if (username.length > 0 && password.length > 0) {
                var auth = "Basic "+$.base64Encode(username+':'+password);
                this.fluidrefreshmentdb(COOKIE_AUTH_TOKEN, auth);
                this.fluidrefreshmentdb(COOKIE_USERNAME, username);
                session_status(this);                
            } else {
                alert("You must supply a username and password");
            }
        });

        /*
         * This path will always match. Its function is to set the appropriate
         * session state indicator ("Logged in as: foo" or a login form) in the
         * menu bar of every page.
         */
        this.get('#/', function(context) {
            // to set the login element as a trigger for a jQuery dialog
            initialise_login();
            // to make the help text on the search form change as the type of
            // query is changed in the select element
            $('#search_type').change(function() {
                var selected = $('#search_type option:selected');
                $('#option_help').html(selected.attr('title'));
            });
            // Make sure we display either the login link or details of the
            // logged in user
            session_status(this);
            // The following creates the map and initially centres it on the
            // middle of the UK.
            var myOptions = {
                zoom: 5,
                center: new google.maps.LatLng(55.0, -5.317383),
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };
            map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
            map.controls[google.maps.ControlPosition.RIGHT].push(pb.getDiv());
            // initialise_map will attempt to locate the user and re-center
            // and zoom in 
            initialise_map();
            // Now that everything is set-up, enable the search form - we do
            // this otherwise the POST from the form doesn't get caught by
            // Sammy but is sent to FluidDB resulting in a confusing error! :-(
            $('#search_type').removeAttr('disabled');
            $('#search_for').removeAttr('disabled');
            $('#search_submit').removeAttr('disabled');
        });

    });

    $(function() {
        app.run('#/');
    });
})(jQuery);
