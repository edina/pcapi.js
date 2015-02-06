/*
Copyright (c) 2014, EDINA.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this
   list of conditions and the following disclaimer in the documentation and/or
   other materials provided with the distribution.
3. All advertising materials mentioning features or use of this software must
   display the following acknowledgement: This product includes software
   developed by the EDINA.
4. Neither the name of the EDINA nor the names of its contributors may be used to
   endorse or promote products derived from this software without specific prior
   written permission.

THIS SOFTWARE IS PROVIDED BY EDINA ''AS IS'' AND ANY EXPRESS OR IMPLIED
WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
SHALL EDINA BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
DAMAGE.
*/

"use strict";

var pcapi = (function(){

    // List of reserved dirs
    var reservedDirs = ['editors', 'layers', 'records'];

    /**
     * Unset user login id.
     */
    var clearCloudLogin = function(){
        localStorage.setItem('cloud-user', JSON.stringify({'id': undefined}));
    };

    /**
     * Login to cloud provider.
     * @paran provider The provider type.
     * @param callback Function called after login attempt.
     * @param cbrowser Function to allow caller requires access to childbrowser.
     */
    var doLogin = function(provider, callback, cbrowser){
        var loginUrl = _this.getCloudProviderUrl() + '/auth/' + provider;
        if (provider === 'local') {
            doLoginLocal(callback, cbrowser, loginUrl);
        }
        else{
            doLoginDropBox(callback, cbrowser, loginUrl);
        }
    };

    /**
     * Login to a local cloud provider.
     * @param callback Function called after login attempt.
     * @param loginUrl
     */
    var doLoginLocal = function(callback, cbrowser, loginUrl){
        var pollTimer,
            pollTimerCount = 0,
            pollInterval = 3000,
            pollForMax = 5 * 60 * 1000; //min
        var pollUrl = loginUrl;
        console.debug('Login with: ' + pollUrl);
        var cb = window.open(pollUrl, '_blank', 'location=no');


        // close child browser
        var closeCb = function(userId){
            clearInterval(pollTimer);
            callback(userId);
        };

        console.debug('Poll: ' + pollUrl);
        pollTimer = setInterval(function(){
            $.ajax({
                url: pollUrl,
                timeout: 3000,
                success: function(pollData){
                    pollTimerCount += pollInterval;

                    // Ignore html responses (like the redirection from Shibboleth)
                    if(typeof(pollData) === 'object'){
                      if(pollData.state === 1 || pollTimerCount > pollForMax){
                          var cloudUserId;
                          if(pollData.state === 1 ){
                              cloudUserId = pollData.userid;
                              _this.setCloudLogin(cloudUserId);
                          }
                          cb.close();
                          closeCb(cloudUserId);
                      }
                    }
                },
                error: function(error){
                    console.error("Problem polling api: " + error.statusText);
                    closeCb();
                },
            });
        }, pollInterval);

        if(cbrowser){
            // caller may want access to child browser reference
            cbrowser(cb);
        }
    };

    /**
     * Login to dropbox.
     * @param callback Function called after login attempt.
     * @param cbrowser Function to allow caller requires access to childbrowser.
     * @param loginUrl
     */
    var doLoginDropBox = function(callback, cbrowser, loginUrl){
        var pollTimer, pollTimerCount = 0, pollInterval = 3000, pollForMax = 5 * 60 * 1000; //min

        var userId = getCloudLoginId();
        if(userId !== undefined){
            console.debug("got a user id: " + userId);
            loginUrl += '/' + userId;
        }

        // clear user id
        clearCloudLogin();
        console.debug('Login with: ' + loginUrl + '?async=true');

        $.ajax({
            url: loginUrl + '?async=true',
            timeout: 3000,
            cache: false,
            success: function(data){
                console.debug("Redirect to: " + data.url);
                var cloudUserId = data.userid;

                // close child browser
                var closeCb = function(userId){
                    clearInterval(pollTimer);
                    callback(userId);
                };

                // open dropbox login in child browser
                var cb = window.open(data.url, '_blank', 'location=no');
                //cb.addEventListener('exit', closeCb);

                var pollUrl = loginUrl + '/' + cloudUserId + '?async=true';
                console.debug('Poll: ' + pollUrl);
                pollTimer = setInterval(function(){
                    $.ajax({
                        url: pollUrl,
                        success: function(pollData){
                            pollTimerCount += pollInterval;

                            if(pollData.state === 1 || pollTimerCount > pollForMax){
                                if(pollData.state === 1 ){
                                    _this.setCloudLogin(cloudUserId);
                                }
                                cb.close();
                                closeCb(cloudUserId);
                            }
                        },
                        error: function(error){
                            console.error("Problem polling api: " + error.statusText);
                            closeCb({"status": -1, "msg": "Problem polling api"});
                        },
                        cache: false
                    });
                }, pollInterval);

                if(cbrowser){
                    // caller may want access to child browser reference
                    cbrowser(cb);
                }
            },
            error: function(jqXHR, textStatus){
                var msg;
                if(textStatus === undefined){
                    textStatus = ' Unspecified Error.';
                }
                else if(textStatus === "timeout") {
                    msg = "Unable to login, please enable data connection.";
                }
                else{
                    msg = "Problem with login: " + textStatus;
                }

                callback({"status": -1, "msg": msg});
                console.error(msg);
            }
        });
    };

    var doRequest = function(method, url, data, contentType) {
        // Return a new promise.
        return new Promise(function(resolve, reject) {
            // Do the usual XHR stuff
            var req = new XMLHttpRequest();
            if(method === "GET" && data){
                url += "?"+Object.keys(data).map(function(k) {
                    return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
                }).join('&');
            }
            req.open(method, url);

            req.onload = function() {
                // This is called even on 404 etc
                // so check the status
                if (req.status == 200) {
                    // Resolve the promise with the response text
                    if (req.response.error === 1){
                        reject(Error(req.response.msg));
                    }
                    else{
                        resolve(req.response);
                    }
                }
                else {
                    // Otherwise reject with the status text
                    // which will hopefully be a meaningful error
                    reject(Error(req.statusText));
                }
            };

            // Handle network errors
            req.onerror = function() {
                reject(Error("Network Error"));
            };

            // Make the request
            if(method === "POST" || method === "PUT"){
                if(contentType){
                    req.setRequestHeader("Content-type", contentType);
                }
                else{
                    req.setRequestHeader("Content-type","application/x-www-form-urlencoded");
                }
                req.send(data);
            }
            else{
                req.send();
            }
        });
    };

    /**
     * Get the cloud login from local storage.
     */
    var getCloudLogin = function(){
        var login = null;
        var user = localStorage.getItem('cloud-user');
        if(user){
            login = JSON.parse(user);
        }

        return login;
    };

    /**
     * Get the cloud login id from local storage.
     */
    var getCloudLoginId = function(){
        var id;
        var login = getCloudLogin();
        if(typeof(login) === 'object'){
            id = login.id;
        }

        return id;
    };

    /*
     * Encode a dictionary as url parameters
     * @param obj a key/value object
     * @return an string of the form key1=value1&key2=value2
    */
    var objectToURL = function(obj){
        var params = [];
        if(typeof(obj) === 'object'){
            for(var key in obj){
                if(obj.hasOwnProperty(key)){
                    params.push(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]));
                }
            }
        }
        return params.join("&");
    };

    /**
     * function for finding th extension of a string
     * @param string
     * @suffix
     * @returns true/false if suffix aggrees with string extension
     */
    var endsWith = function(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    };

    var _this = {

        /**
         * Initialize pcapi object
         * @param options.url url of the PCAPI
         * @param options.version version number of PCAPI
         */
        init: function(options){
            this.baseUrl = options.url;
            this.version = options.version;
            this.cloudProviderUrl = options.url + "/" + options.version + "/pcapi";
        },

        /**
         * function for building the main urls
         * <domain>/<version>/pcapi/<records/editors>/<provider>/<userid>/...
         * @param {String} remoteDir [editors|records]
         * @param {String} path the folder/file inside the records/editors folder
         * @return {String} url
         */
        buildUrl : function(remoteDir, path, urlParams){
            var userId = getCloudLoginId();
            return this.buildUserUrl(userId, remoteDir, path, urlParams);
        },

        /**
         * function for building urls for users different from the logged in ones
         * <domain>/<version>/pcapi/<records/editors>/<provider>/<userid>/...
         * @param {String} userId
         * @param {String} remoteDir [editors|records]
         * @param {String} path extra path
         * @param {String} urlParams extra path
         * @return {String} url
         */
        buildUserUrl: function(userId, remoteDir, path, urlParams){
            path = path || '';
            var params = objectToURL(urlParams);
            if(params.length > 0){
                params = '?' + params;
            }

            return this.getCloudProviderUrl() + '/' + remoteDir + '/' +
                   this.getProvider() + '/' + userId + '/' + path + params;
        },

        /**
         * function for building the main urls
         * <domain>/<version>/pcapi/fs/<provider>/<userid>/<folder>/
         * @param {String} remoteDir the remote dir
         * @param {String} path the folder/file inside the remoteDir folder
         * @return {String} url
         */
        buildFSUrl : function(remoteDir, path){
            var userId = getCloudLoginId();
            return this.buildFSUserUrl(userId, remoteDir, path);
        },

        /**
         * function for building the main urls
         * <domain>/<version>/pcapi/fs/<provider>/<userid>/<folder>/
         * @param {String} userId
         * @param {String} remoteDir the remote dir
         * @param {String} path the folder/file inside the remoteDir folder
         * @return {String} url
         */
        buildFSUserUrl : function(userId, remoteDir, path){
            path = path || '';
            if(userId !== ""){
                userId = "/"+userId;
            }
            return this.getCloudProviderUrl() + '/fs/' +
                this.getProvider() + userId +'/'+remoteDir+'/'+path;
        },

        /**
         * Check if the user is logged in
         * @param callback function after checking the login status
         */
        checkLogin: function(callback){
            if(!this.userId){
                console.log("check if user is logged in");
                var user = getCloudLogin();
                if(user !== null && user.id){
                    var url = this.getCloudProviderUrl() + '/auth/'+this.getProvider();
                    if (user.id !== "local") {
                        url += '/'+user.id;
                    }

                    console.debug("Check user with: " + url);
                    $.ajax({
                        url: url,
                        type: "GET",
                        dataType: 'json',
                        cache: false,
                        success: $.proxy(function(data){

                            if(data.state === 1){
                                this.setCloudLogin(user.id, user.cursor);
                            }

                            callback(true, data);
                        }, this),
                        error: function(jqXHR, status, error){
                            callback(false, error);
                        }
                    });
                }
                else{
                    console.debug("No user session saved");
                    this.logoutCloud();
                }
            }
            else{
                callback(this.userId);
            }
        },

        /**
         * Delete a record|editor on the cloud
         * @param {String} remoteDir remote directory [records|editors]
         * @param {String} path, could be either editor or record
         * @param {String} userId
         */
        deleteItem: function(remoteDir, path, userId){
            userId = userId || getCloudLoginId();
            var url = this.buildFSUserUrl(userId, remoteDir, path);

            console.debug("Delete item from "+remoteDir+" with " + url);

            return new Promise(function(resolve, reject){
                doRequest("DELETE", url).then(function(result){
                    resolve(JSON.parse(result));
                }, function (error) {
                    console.error("Problem with " + url + " : status=" +
                                  status + " : " + error);
                    reject(Error("Problem with " + url + " : status=" +
                                  status + " : " + error));
                });
            });
        },

        /**
         * Export a record on the
         * @param options.remoteDir remote directory [records|editors]
         * @param options.item, could be either editor or record
         * @param callback function after fetching the items
         */
        /*exportItem: function(options, callback){

            var url = this.buildUrl("export", options.item.name);

            console.debug("PUT item to "+options.remoteDir+" with " + url);

            $.ajax({
                type: "POST",
                data: data,
                cache: false,
                url: url,
                success: function(data){
                    if(data.error == 1){
                        callback(false);
                    }
                    else{
                        callback(true, data);
                    }
                },
                error: function(jqXHR, status, error){
                    console.error("Problem with " + url + " : status=" +
                                  status + " : " + error);
                    callback(false);
                }
            });
        },*/

        /**
         * function for getting the assets urls
         */
        getAssets: function(){
            var options = {
                "remoteDir": "records",
                "extras": "assets/images/",
                "filters": {"frmt": "url"}
            };
            return this.getItems(options);
        },

        /**
         * @return The base url
         */
        getBaseUrl: function() {
            return this.baseUrl;
        },

        /**
         * @return The URL to the cloud provider.
         */
        getCloudProviderUrl: function() {
            return this.cloudProviderUrl;
        },

        /**
         * Fetch all the items on the cloud
         * @param {String} remoteDir remote directory
         * @param {String} userId
         */
        getFSItems: function(remoteDir, userId){
            userId = userId || getCloudLoginId();
            var url = this.buildFSUserUrl(userId, remoteDir);

            console.debug("Get items of "+remoteDir+" with " + url);

            return new Promise(function(resolve, reject){
                doRequest("GET", url).then(function(result){
                    resolve(JSON.parse(result));
                }, function (error) {
                    console.error("Problem with " + url + " : status=" +
                                  status + " : " + error);
                    reject(Error("Problem with " + url + " : status=" +
                                  status + " : " + error));
                });
            });
        },

        /**
         * Fetch an item on the cloud
         * @param options.remoteDir remote directory
         * @param options.item the file
         */
        getFSItem: function(options){
            var userId = options.userId || getCloudLoginId();
            var url = this.buildFSUserUrl(userId, options.remoteDir, options.item);

            console.debug("Get item "+options.item+" of "+options.remoteDir+" with " + url);

            return new Promise(function(resolve, reject){
                doRequest("GET", url).then(function(result){
                    if(options.remoteDir === "records") {
                        resolve(JSON.parse(result));
                    }
                    else{
                        resolve(result);
                    }
                }, function (error) {
                    console.error("Problem with " + url + " : status=" +
                                  status + " : " + error);
                    reject(Error("Problem with " + url + " : status=" +
                                  status + " : " + error));
                });
            });

        },

        /**
         * Fetch all the records|editors on the cloud
         * @param options.remoteDir remote directory [records|editors]
         * @param options.item get a file from PCAPI
         * @param options.userId if we want to use different userid
         */
        getItem: function(options){
            var userId = options.userId || getCloudLoginId();
            var url = this.buildUserUrl(userId, options.remoteDir, options.item);

            console.debug("Get item "+options.item+" of "+options.remoteDir+" with " + url);

            return new Promise(function(resolve, reject){
                doRequest("GET", url).then(function(result){
                    if(options.remoteDir === 'records'){
                        resolve(JSON.parse(result));
                    }
                    else{
                        resolve(result);
                    }
                }, function (error) {
                    //console.log(error)
                    console.error("Problem with " + url + " : status=" +
                                  status + " : " + error);
                    reject(Error("Problem with " + url + " : status=" +
                                  status + " : " + error));
                });
            });
        },

        /**
         * Fetch all the records|editors on the cloud
         * @param options.remoteDir remote directory [records|editors]
         * @param options.extras path for url
         * @pamam options.filters filter for records
         */
        getItems: function(options){
            var userId = options.userId || getCloudLoginId();
            var url = this.buildUserUrl(userId, options.remoteDir, options.extras);

            console.debug("Get items of "+options.remoteDir+" with " + url);
            //if it's undefined make it empty object in order not to break it
            if(options.filters === undefined){
                options.filters = {};
            }
            console.log("with filters "+JSON.stringify(options.filters));

            return new Promise(function(resolve, reject){
                doRequest("GET", url, options.filters).then(function(result){
                    resolve(JSON.parse(result));
                }, function (error) {
                    console.error("Problem with " + url + " : status=" +
                                  status + " : " + error);
                    reject(Error("Problem with " + url + " : status=" +
                                  status + " : " + error));
                });
            });
        },

        /**
         * function for getting the parameters of the url. It's needed
         * for the synchronous login.
         * @returns object with key, values of the url parameters
         */
        getParameters: function (){
            var query = window.location.search.substring(1);
            var queryString = {};
            var params = query.split("&");
            for(var i=0; i<params.length; i++){
                var pair = params[i].split("=");
                if (typeof queryString[pair[0]] === "undefined") {
                    queryString[pair[0]] = pair[1];
                    // If second entry with this name
                } else if (typeof queryString[pair[0]] === "string") {
                    var arr = [ queryString[pair[0]], pair[1] ];
                    queryString[pair[0]] = arr;
                    // If third or later entry with this name
                } else {
                    queryString[pair[0]].push(pair[1]);
                }
            }
            return queryString;
        },

        /**
         * Get all providers PCAPI supports
         * @return promise with the data for providers
         */
        getProviders: function(response){
            var url = this.getCloudProviderUrl()+"/auth/providers";
            return new Promise(function(resolve, reject){
                doRequest("GET", url).then(function(result){
                    resolve(JSON.parse(result));
                }, function (error) {
                    console.error("Problem with " + url + " : status=" +
                                  status + " : " + error);
                    reject(Error("Problem with " + url + " : status=" +
                                  status + " : " + error));
                });
            });
        },

        /**
         * function for getting the provider that the user has selected for PCAPI
         * @returns the provider from
         */
        getProvider: function(){
            return localStorage.getItem('cloud-provider') || 'local';
        },

        /**
         * @return The cloud login user.
         *   id - cloud user id
         *   cursor - cursor of last sync.
         */
        getUser: function(){
            return this.user;
        },

        /**
         * function for getting the userid
         * @returns the userId for PCAPI
         */
        getUserId: function(){
            var id = getCloudLoginId();
            return id;
        },

        /**
         * Login to cloud provider asynchronously
         */
        loginAsyncCloud: function(provider, cb, cbrowser){
            doLogin(provider, cb, cbrowser);
        },

        /**
         * function for loging in PCAPI synchronously
         */
        loginCloud: function(){
            if(!("uid" in this.getParameters())){
                var loginUrl = this.getCloudProviderUrl() + '/auth/'+this.getProvider()+"?callback="+$(location).attr('href');
                $.getJSON(loginUrl, function(data) {
                    $(location).attr('href',data.url);
                });
            }
        },

        /**
         * Logout from cloud provider.
         */
        logoutCloud: function(){
            clearCloudLogin();
        },

        /**
         * Post a record|editor on the cloud
         * @param {String} options.remoteDir remote directory [records|editors]
         * @param {Object} options.path could be either editor or record
         * @param {Object, String} options.data
         * @param {String} options.userId
         */
        saveItem: function(options){
            var data, path, url;
            var userId = options.userId || getCloudLoginId();
            if(options.remoteDir === "records") {
                data = JSON.stringify(options.data, undefined, 2);
                path = options.path;
                url = this.buildUserUrl(userId, options.remoteDir, path);
            }
            else if(options.remoteDir === "editors") {
                data = options.data;
                path = options.path+".edtr";
                url = this.buildUserUrl(userId, options.remoteDir, path);
            }
            else{
                url = this.buildFSUserUrl(userId, options.remoteDir, path);
            }

            console.debug("Post item to "+options.remoteDir+" with " + url);
            return new Promise(function(resolve, reject){
                doRequest("POST", url, data).then(function(result){
                    resolve(JSON.parse(result));
                }, function (error) {
                    console.error("Problem with " + url + " : status=" +
                                  status + " : " + error);
                    reject(Error("Problem with " + url + " : status=" +
                                  status + " : " + error));
                });
            });

        },

        /**
         * @param url, the base url
         */
        setBaseUrl: function(url) {
            this.baseUrl = url;
        },

        /**
         * Store cloud user id in local storage.
         */
        setCloudLogin: function(userId, cursor){
            this.user = {
                'id': userId,
                'cursor': cursor
            };

            localStorage.setItem('cloud-user', JSON.stringify(this.user));
        },

        /**
         * Set the cloud provider URL.
         * @param root The Server URL root.
         */
        setCloudProviderUrl: function(url){
            this.cloudProviderUrl = url + "/" + this.version + "/pcapi";
        },

        /**
         * function for setting the provider of PCAPI in the localStorage
         * @param provider
         */
        setProvider: function(provider){
            localStorage.setItem('cloud-provider', provider);
            //this.provider = provider;
        },

        /**
         * function for setting up the userId which comes from PCAPI
         * @param userId
         */
        setUserId: function(userId){
            this.userId = userId;
        },

        /**
         * Update a record|editor on the cloud
         * @param {String} options.remoteDir remote directory [records|editors]
         * @param {String} options.path, could be either editor or record
         * @param {String} options.data
         * @param {String} options.userId
         */
        updateItem: function(options){
            var data, path, url;
            var userId = options.userId || getCloudLoginId();
            if(options.remoteDir === "records") {
                data = JSON.stringify(options.data, undefined, 2);
                path = options.path;
                url = this.buildUserUrl(userId, options.remoteDir, path);
            }
            else if(options.remoteDir === "editors") {
                data = options.data;
                path = options.path+".edtr";
                url = this.buildUserUrl(userId, options.remoteDir, path);
            }
            else{
                url = this.buildFSUserUrl(userId, options.remoteDir, path);
            }

            console.debug("PUT item to "+options.remoteDir+" with " + url);

            return new Promise(function(resolve, reject){
                doRequest("PUT", url, data).then(function(result){
                    resolve(JSON.parse(result));
                }, function (error) {
                    console.error("Problem with " + url + " : status=" +
                                  status + " : " + error);
                    reject(Error("Problem with " + url + " : status=" +
                                  status + " : " + error));
                });
            });

        },

        /**
         * function for uploading a file
         * @param {String} options.remoteDir
         * @param options.path
         * @param options.file
         * @param options.userid
         */
        uploadFile: function(options){

            var userId = options.userid || getCloudLoginId();
            var url = this.buildUserUrl(userId, 'fs', options.remoteDir + '/' + options.path);

            console.debug("Upload item "+options.file.name+" to "+options.remoteDir+" with " + url);
            var formData = new FormData();
            formData.append("upload", options.file);

            return new Promise(function(resolve, reject){
                doRequest("POST", url, formData, options.contentType).then(function(result){
                    resolve(JSON.parse(result));
                }, function (error) {
                    console.error("Problem with " + url + " : status=" +
                                  status + " : " + error);
                    reject(Error("Problem with " + url + " : status=" +
                                  status + " : " + error));
                });
            });
        
            //$.ajax({
            //    type: "POST",
            //    beforeSend: function(request) {
            //        request.setRequestHeader("Content-Type", options.file.type);
            //    },
            //    url: url,
            //    data: options.file,
            //    processData: false,
            //    contentType: false,
            //    success: function(data) {
            //        callback(true, data);
            //    },
            //    error: function(data) {
            //        var obj = jQuery.parseJSON(data);
            //        callback(false, obj.error);
            //    }
            //});
        }
    };

    return _this;
})();
