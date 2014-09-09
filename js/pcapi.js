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

var pcapi = function(){

    var buildUrl = function(remoteDir, item){
        var userId = _this.getCloudLoginId();
        if (userId !== "") {
            userId = "/"+userId;
        }
        return _this.getCloudProviderUrl() + '/'+remoteDir+'/' +
                _this.getProvider() + userId +'/'+item;
    };

    var buildFSUrl = function(remoteDir, item){
        var userId = _this.getCloudLoginId();
        if (userId != "") {
            userId = "/"+userId;
        }
        return _this.getCloudProviderUrl() + '/fs/' +
                _this.getProvider() + userId +'/'+remoteDir+'/'+item;
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
        var pollTimer, pollTimerCount = 0, pollInterval = 3000, pollForMax = 5 * 60 * 1000; //min
        var pollUrl = loginUrl + '?async=true';
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

                    if(pollData.state === 1 || pollTimerCount > pollForMax){
                        var cloudUserId = "local";
                        if(pollData.state === 1 ){
                            _this.setCloudLogin(cloudUserId);
                        }
                        cb.close();
                        closeCb("local");
                    }
                },
                error: function(error){
                    console.error("Problem polling api: " + error.statusText);
                    closeCb (-1);
                },
                cache: false
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
                            closeCb(-1);
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

                console.error(msg);
            }
        });
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
            this.cloudProviderUrl = options.url + "/" + options.version + "/pcapi";
        },

        /**
         * Check if the user is logged in
         * @param token the token that comes form auth
         * @param callback function after checking the login status
         */
        checkIfLoggedIn: function(token, callback){
            console.log("check if user is logged in");
            var user = this.getCloudLogin();
            if(user !== null && user.id){
                var url = pcapi.getCloudProviderUrl() + '/auth/'+this.getProvider();
                if (user.id != "local") {
                    url += '/'+user.id;
                }

                console.debug("Check user with: " + url);
                $.ajax({
                    url: url,
                    type: "GET",
                    dataType: 'json',
                    cache: false,
                    success: $.proxy(function(response){
                        if(data.state === 1){
                            this.setCloudLogin(user.id, user.cursor);
                        }
                        callback(true, response);
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
        },

        checkLogin: function(callback){
        if(!this.userId){
            var user = getCloudLogin();
            if(user !== null && user.id){
                var url = pcapi.getCloudProviderUrl() + '/auth/'+pcapi.getProvider();
                if (user.id != "local") {
                    url += '/'+user.id;
                }

                console.debug("Check user with: " + url);
                $.ajax({
                    type: 'GET',
                    dataType: 'json',
                    url: url,
                    cache: false,
                    success: $.proxy(function(data){
                        if(data.state === 1){
                            this.setCloudLogin(user.id, user.cursor);
                        }

                        callback(user.id);
                    }, this),
                    error: $.proxy(function(error){
                        console.error("Error with user: " + url + " : " + error.msg);
                        this.logoutCloud();
                    }, this)
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
         * @param remoteDir remote directory [records|editors]
         * @param item, could be either editor or record
         * @param callback function after fetching the items
         */
        deleteItem: function(remoteDir, item, callback){
            var url = buildUrl(remoteDir, "");

            console.debug("Delete item from "+remoteDir+" with " + url);
            if(remoteDir === "records"){
                url = url+item.name;
            }
            else if(remoteDir === "editors"){
                url = url+item+".edtr";
            }

            $.ajax({
                type: "DELETE",
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
        },

        /**
         * function for getting the assets urls
         * @param callback function
         */
        getAssets: function(callback){
            this.getItems("records", "assets/images", {"frmt": "url"}, function(success, data){
                callback(success, data);
            })
        },

        /**
         * @return The URL to the cloud provider.
         */
        getCloudProviderUrl: function() {
            return this.cloudProviderUrl;
        },

        /**
         * Get the cloud login from local storage.
         */
        getCloudLogin: function(){
            var login = null;
            var user = localStorage.getItem('cloud-user');
            if(user){
                login = JSON.parse(user);
            }

            return login;
        },

        /**
         * Get the cloud login id from local storage.
         */
        getCloudLoginId: function(){
            var id;
            var login = this.getCloudLogin();
            if(login){
                id = login.id;
                if(id === 'local'){
                    id = "";
                }
            }
            return id;
        },

        /**
         * Unset user login id.
         */
        clearCloudLogin: function(){
            localStorage.setItem('cloud-user', JSON.stringify({'id': undefined}));
        },

        /**
         * Fetch all the items on the cloud
         * @param remoteDir remote directory
         * @param callback function after fetching the items
         */
        getFSItems: function(remoteDir, callback){
            var url = buildFSUrl(remoteDir, "");

            console.debug("Get items of "+remoteDir+" with " + url);

            $.ajax({
                type: "GET",
                dataType: "json",
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
                },
                cache: false
            });
        },

        /**
         * Fetch all the records|editors on the cloud
         * @param remoteDir remote directory [records|editors]
         * @param item get a file from PCAPI
         * @param dataType of the item (json, html, txt)
         * @param callback function after fetching the items
         */
        getItem: function(remoteDir, item, dataType, callback){
            var url = buildUrl(remoteDir, item);

            console.debug("Get item "+item+" of "+remoteDir+" with " + url + " and dataType " + dataType);

            $.ajax({
                type: "GET",
                dataType: dataType,
                url: url,
                success: function(data){
                    console.log(data)
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
                },
                cache: false
            });
        },

        /**
         * Fetch all the records|editors on the cloud
         * @param remoteDir remote directory [records|editors]
         * @param extra path for url
         * @param callback function after fetching the items
         */
        getItems: function(remoteDir, extras, filters, callback){
            var url = buildUrl(remoteDir, extras);

            console.debug("Get items of "+remoteDir+" with " + url);
            //if it's undefined make it empty object in order not to break it
            if(filters === undefined){
                filters = {};
            }
            else{
                console.log(filters);
            }

            $.ajax({
                type: "GET",
                dataType: "json",
                url: url,
                data: filters,
                success: function(data){
                    console.log(data);
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
                },
                cache: false
            });
        },

        getParameters: function (){
            var query = window.location.search.substring(1);
            var query_string = {};
            var params = query.split("&");
            for(var i=0; i<params.length; i++){
                var pair = params[i].split("=");
                if (typeof query_string[pair[0]] === "undefined") {
                    query_string[pair[0]] = pair[1];
                    // If second entry with this name
                } else if (typeof query_string[pair[0]] === "string") {
                    var arr = [ query_string[pair[0]], pair[1] ];
                    query_string[pair[0]] = arr;
                    // If third or later entry with this name
                } else {
                    query_string[pair[0]].push(pair[1]);
                }
            }
            return query_string;
        },

        /**
         * Get all providers PCAPI supports
         * @param callback function after fetching the providers
         */
        getProviders: function(callback){
            var url = this.getCloudProviderUrl()+"/auth/providers";
            $.ajax({
                url: url,
                dataType: "json",
                cache: false
            }).done(function(data){
                callback(true, data);
            }).error(function(jqXHR, status, error){
                console.error("Problem with " + url + " : status=" +
                                  status + " : " + error);
                callback(false);
            });
        },

        /**
         * function for getting the provider that the user has selected for PCAPI
         * @returns the provider from
         */
        getProvider: function(){
            return localStorage.getItem('cloud-provider');
        },

        /**
         * function for getting the userid
         * @returns the userId for PCAPI
         */
        getUserId: function(){
            //TO-DO check headers of request
            var id = this.getCloudLoginId();
            if (id != "") {
                id = "/"+id;
            }
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
                var loginUrl = this.getCloudProviderUrl() + '/auth/'+this.getProvider()+"?callback="+$(location).attr('href');;
                $.getJSON(loginUrl, function(data) {
                    $(location).attr('href',data.url);
                });
            }
        },

        /**
         * Logout from cloud provider.
         */
        logoutCloud: function(){
            this.clearCloudLogin();
        },

        /**
         * Post a record|editor on the cloud
         * @param remoteDir remote directory [records|editors]
         * @param item, could be either editor or record
         * @param callback function after fetching the items
         */
        saveItem: function(remoteDir, item, callback){

            var url = buildUrl(remoteDir, "");

            console.debug("Post item to "+remoteDir+" with " + url);
            var data;
            if(remoteDir === "records"){
                data = JSON.stringify(item, undefined, 2);
                url = url+encodeURIComponent(item.name);
            }
            else if(remoteDir === "editors"){
                data = item.editor.join("");
                url = url+encodeURIComponent(item.name)+".edtr";
                console.log(data)
            }

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
        },

        /**
         * Store cloud user id in local storage.
         */
        setCloudLogin: function(userId, cursor){
            this.user = {
                'id': userId,
                'cursor': cursor
            };
            console.log(this.user)

            localStorage.setItem('cloud-user', JSON.stringify(this.user));
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
         * @param remoteDir remote directory [records|editors]
         * @param item, could be either editor or record
         * @param for records we need to know which specific file to update
         * @param callback function after fetching the items
         */
        updateItem: function(remoteDir, item, file, callback){

            var url = buildUrl(remoteDir, "");

            console.debug("PUT item to "+remoteDir+" with " + url);
            var data;
            if(remoteDir === "records"){
                data = JSON.stringify(item, undefined, 2);
                url = url+item.name+"/"+file;
            }
            else if(remoteDir === "editors"){
                data = item.editor;
                url = url+item.name+".edtr";
            }

            $.ajax({
                type: "PUT",
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
        },

        /**
         * function for uploading a file
         * @param remoteDir
         * @param file
         */
        uploadFile: function(remoteDir, filename, file, callback){

            var url = buildFSUrl(remoteDir, filename);

            console.debug("Upload item "+file.name+" to "+remoteDir+" with " + url);

            $.ajax({
                type: "POST",
                beforeSend: function(request) {
                    request.setRequestHeader("X-Parse-Application-Id", 'MY-APP-ID');
                    request.setRequestHeader("X-Parse-REST-API-Key", 'MY-REST-API-ID');
                    request.setRequestHeader("Content-Type", file.type);
                },
                url: url,
                data: file,
                processData: false,
                contentType: false,
                success: function(data) {
                    callback(true, data);
                },
                error: function(data) {
                    var obj = jQuery.parseJSON(data);
                    callback(false, obj.error);
                }
            });
        }
    };
    
    return _this;
};