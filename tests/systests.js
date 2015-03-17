"use strict"
//chai.use(chaiAsPromised);
var assert = chai.assert;

var providers = ['local', 'dropbox'];
var testPcapi = pcapi;
var finished = false;

//initialize pcpapi with local provider
var options = config.options[0];
testPcapi.init(options);
//set the provider
testPcapi.setProvider(options.provider);
//set the userid
testPcapi.setCloudLogin(options.userId);

//providers
describe('#checkProviders', function(done){
    //get all providers
    it('check for the providers', function(done){

        testPcapi.getProviders().done(function(data){
            try {
                expect(data).to.have.keys(providers[0], providers[1]);
                done();
            } catch(e){
                console.log(e)
                done(e);
            }
        });
    });

    //get the selected provider
    it('check for selected provider', function(done){
        expect(testPcapi.getProvider()).to.equal(providers[0]);
        done();
    });
});

//user
describe('#User functions', function(){
    //getuserid
    it('get user id', function(done) {
        expect(testPcapi.getUserId()).to.equal(config.options[0].userId);
        done();
    });
});


//buildUrls
describe('#URLS', function(){
    //base url
    it('base url check', function(done){
        var url = config.options[0].url;
        assert.equal(testPcapi.getBaseUrl(), url);
        done();
    });

    //cloud provider url
    it('cloud provider url check', function(done){
        var url = config.options[0].url+"/1.3/pcapi";
        assert.equal(testPcapi.getCloudProviderUrl(), url);
        done();
    });

    //buildURL
    it('buildURL, works for editors, records', function(done){
        var url = config.options[0].url+"/1.3/pcapi/records/local/00000000-0000-0000-0000-000000000000/Text (20-08-2014 16h18m18s)";
        assert.equal(testPcapi.buildUrl("records", record1.name), url);
        done();
    });

    //buildUserUrl
    it('buildUserURL, works for editors, records', function(done){
        var url = config.options[0].url+"/1.3/pcapi/records/local/xxxxxx/Text (20-08-2014 16h18m18s)";
        assert.equal(testPcapi.buildUserUrl("xxxxxx", "records", record1.name), url);
        done();
    });

    //buildFSUrl
    it('buildFSURL, works for any folder', function(done){
        var url = config.options[0].url+"/1.3/pcapi/fs/local/00000000-0000-0000-0000-000000000000/records/Text (20-08-2014 16h18m18s)";
        assert.equal(testPcapi.buildFSUrl("records", record1.name), url);
        done();
    });

    //buildFSUserUrl
    it('buildFSUserURL, works for any folder', function(done){
        var url = config.options[0].url+"/1.3/pcapi/fs/local/xxx/records/Text (20-08-2014 16h18m18s)";
        assert.equal(testPcapi.buildFSUserUrl("xxx", "records", record1.name), url);
        done();
    });
});

describe('#Record', function(){
    var waitSave1 = true,
        waitSave2 = true,
        waitDelete = true;

    //upload a fresh record
    it('upload an fresh record', function(done){
        var res = {"msg": "File uploaded", "path": "/records/"+record1.name+"/record.json", "error": 0};
        var options = {
            "remoteDir": "records",
            "path": record1.name,
            "data": record1
        };


        testPcapi.saveItem(options).then(function(result){
            try {
                assert.deepEqual(result, res);
                waitSave1 = false;
                done();
            } catch(x) {
                done(x);
            }
        });
    });

    //upload a fresh record
    it('upload an second fresh record', function(done){
        var res = {"msg": "File uploaded", "path": "/records/"+record2.name+"/record.json", "error": 0};
        var options = {
            "remoteDir": "records",
            "path": record2.name,
            "data": record2
        };

        testPcapi.saveItem(options).then(function(result){
            try {
                assert.deepEqual(result, res);
                waitSave2 = false;
                done();
            } catch(x) {
                done(x);
            }
        });
    });

    //check the saveItem for when the userId is not email or HEX
    it('upload a fresh record with invalid userId', function(done){
        var res = {msg: "'Illegal userid: xxx -- should either HEX or EMAIL'", error: 1};
        var options = {
            "remoteDir": "records",
            "path": record1.name,
            "data": record1,
            "userId": "xxx"
        };


        testPcapi.saveItem(options).then(function(result){
            try {
                assert.deepEqual(result, res);
                done();
            } catch(x) {
                done(x);
            }
        });
    });

    //TODO: check the saveItem for when the server is down
    
    //upload the record that was made beforehand
    it('upload an existing record', function(done){
        var res = {"msg": "File uploaded", "path": "/records/"+record1.name+"/record.json", "error": 0};
        var options = {
            "remoteDir": "records",
            "path": record1.name,
            "data": record1
        };


        //function for checkin if the record has been uploaded from the previous asynchronous call
        var saveRecord = function(done){
            if(waitSave1 === false){
                testPcapi.saveItem(options).then(function(result){
                    if(result.msg === res.msg && result.error === 0 && result.path !== res.path) {
                        waitDelete = false;
                        assert.ok(true, "The record is uploaded but renamed");
                        done();
                    }
                }, function(error) {
                    throw error;
                    done();
                });
            }
            else {
                setTimeout(function() {
                    saveRecord(done);
                }, 2000);
            }
        };
        saveRecord(done);

    });

    //delete the record that was created in the previous async call
    it('delete a record', function(done){
        var res = {msg: "records/Text (20-08-2014 16h18m18s) (1) deleted", error: 0};
        //deep copy record1
        var record1ClonedName = record1.name+" (1)";
        var deleteRecord = function(done){
            if(waitDelete === false) {
                testPcapi.deleteItem("records", record1ClonedName).then(function(result) {
                    //always write catch, otherwise is not catching the error and gives timeout error
                    try {
                        assert.deepEqual(result, res, res.msg);
                        done();
                    } catch (x) {
                        done(x);
                    }
                }, function(error){
                    throw error;
                    done(error)
                });
            }
            else {
                setTimeout(function() {
                    deleteRecord(done)
                }, 2000);
            }
        };
        deleteRecord(done);
    });

    //update record
    it('update a record', function(done){
        this.timeout(6000);
        var res = {"msg": "File uploaded", "path": "/records/Text (20-08-2014 16h18m18s)/record.json", "error": 0};
        var updateRecord = function(done){
            if(waitSave1 === false){
                record1.properties.editor = "text1.edtr";
                var updateOptions = {
                    "remoteDir": "records",
                    "path": record1.name+"/record.json",
                    "data": record1
                };
                testPcapi.updateItem(updateOptions).then(function(result){
                    try {
                        assert.deepEqual(result, res, res.msg);
                        done();
                    } catch(x) {
                        done(x);
                    }
                }, function(error){
                    throw(error);
                    done();
                });
            }
            else {
                setTimeout(function() {
                    updateRecord(result);
                }, 2000);
            }
        };
        updateRecord(done);
    });

    //get All records (getItems/getFSItems)
    it('get all records', function(done){
        this.timeout(6000);
        var options = {
            "remoteDir": "records"
        };
        var res = {"records": [{"Text (20-10-2014 16h18m18s)": {"geometry": {"type": "Point", "coordinates": [5.466076115152644, 51.90957813315172]}, "type": "Feature", "properties": {"fields": [{"id": "fieldcontain-image-1", "val": "1409925195999.jpg", "label": "Image"}], "editor": "myEditor.edtr", "timestamp": "2014-10-20T14:18:25.514Z"}, "name": "Text (20-10-2014 16h18m18s)"}}, {"Text (20-08-2014 16h18m18s)": {"geometry": {"type": "Point", "coordinates": [5.366076115152644, 51.80957813315172]}, "type": "Feature", "properties": {"fields": [], "editor": "text1.edtr", "timestamp": "2014-08-20T14:18:25.514Z"}, "name": "Text (20-08-2014 16h18m18s)"}}], "error": 0};

        testPcapi.getItems(options).then(function(result){
            try {
                assert.deepEqual(result, res, res.msg);
                done();
            } catch(x) {
                done(x);
            }
        });
    });

    //filter Records (getItems)
    it('filter records', function(done){
        //long request
        //BE CAREFUL: there might take more and break the test
        this.timeout(6000);
        var options = {
            "remoteDir": "records",
            "extras": "",
            "filters": {"filter":"editor", "id": "myEditor.edtr"}
        };
        var res = {"records": [{"Text (20-10-2014 16h18m18s)": {"geometry": {"type": "Point", "coordinates": [5.466076115152644, 51.90957813315172]}, "type": "Feature", "properties": {"fields": [{"id": "fieldcontain-image-1", "val": "1409925195999.jpg", "label": "Image"}], "editor": "myEditor.edtr", "timestamp": "2014-10-20T14:18:25.514Z"}, "name": "Text (20-10-2014 16h18m18s)"}}], "error": 0};

        testPcapi.getItems(options).then(function(result){
            try {
                assert.deepEqual(result, res, res.msg);
                done();
            } catch(x) {
                done(x);
            }
        });
    });

    //get FS items
    it('get fs all records', function(done){
        var res = {"metadata": ["/records/Text (20-10-2014 16h18m18s)", "/records/Text (20-08-2014 16h18m18s)"], "error": 0}
        testPcapi.getFSItems('records').then(function(result) {
            try {
                assert.deepEqual(result, res, res.msg);
                done();
            } catch(x) {
                done(x);
            }
        });
    });


    //getItem
    it('get item', function(done){
        var res = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [
                    5.366076115152644,
                    51.80957813315172
                ]
            },
            "properties": {
                "editor": "text1.edtr",
                "fields": [],
                "timestamp": "2014-08-20T14:18:25.514Z"
            },
            "name": "Text (20-08-2014 16h18m18s)"
        };
        var options = {
            "remoteDir": "records",
            "item": record1.name
        };
        testPcapi.getItem(options).then(function(result){
            try {
                console.log(result)
                assert.deepEqual(result, res, "The record is the right one");
                done();
            } catch(x) {
                done(x);
            }
        });
    });

    //getFSItem
    it('get fs item', function(done) {
        var res = {"metadata": ["/records/Text (20-08-2014 16h18m18s)/record.json"], "error": 0};
        var options = {
            "remoteDir": "records",
            "item": record1.name
        };
        testPcapi.getFSItem(options).then(function(result){
            try {
                assert.deepEqual(result, res, "The record is the right one");
                done();
            } catch(x) {
                done(x);
            }
        });
    });

    //uploadFile
    /*it('upload a file', function(done){
        
        //TO-DO: investigate why is not working
        //var canvas = document.getElementById("myCanvas");
        //var dataURL = canvas.toDataURL('image/jpeg', 0.5);
        //var blob = b64toBlob(image, "image/jpg");
        //var blob = new Blob([image], {
        //    type: "image",
        //    filename: "test",
        //    name: "test.jpg"
        //});
        //var options = {
        //    "remoteDir": "records",
        //    "path": record1.name+"/test.jpg",
        //    "file": blob,
        //    "contentType": "jpg"
        //};
        function dataURItoBlob(dataURI) {
            // convert base64/URLEncoded data component to raw binary data held in a string
            var byteString;
            if (dataURI.split(',')[0].indexOf('base64') >= 0)
                byteString = atob(dataURI.split(',')[1]);
            else
                byteString = unescape(dataURI.split(',')[1]);

            // separate out the mime component
            var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

            // write the bytes of the string to a typed array
            var ia = new Uint8Array(byteString.length);
            for (var i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }

            return new Blob([ia], {type:mimeString});
        }
        
        function dataURItoBlob2(dataURI) {
            var binary = atob(dataURI.split(',')[1]);
            var array = [];
            for(var i = 0; i < binary.length; i++) {
                array.push(binary.charCodeAt(i));
            }
            return new Blob([new Uint8Array(array)], {type: 'image/jpeg'});
        }

        function b64toBlob(b64Data, contentType, sliceSize) {
            contentType = contentType || '';
            sliceSize = sliceSize || 512;

            var byteCharacters = atob(b64Data);
            var byteArrays = [];

            for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                var slice = byteCharacters.slice(offset, offset + sliceSize);

                var byteNumbers = new Array(slice.length);
                for (var i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }

                var byteArray = new Uint8Array(byteNumbers);

                byteArrays.push(byteArray);
            }

            var blob = new Blob(byteArrays, {type: contentType});
            return blob;
        }

        var myCanvas = document.createElement("canvas");
        myCanvas.id = "mycanvas";
        document.body.appendChild(myCanvas);
        var context = myCanvas.getContext('2d');

        // draw cloud
        context.beginPath();
        context.moveTo(170, 80);
        context.bezierCurveTo(130, 100, 130, 150, 230, 150);
        context.bezierCurveTo(250, 180, 320, 180, 340, 150);
        context.bezierCurveTo(420, 150, 420, 120, 390, 100);
        context.bezierCurveTo(430, 40, 370, 30, 340, 50);
        context.bezierCurveTo(320, 5, 250, 20, 250, 50);
        context.bezierCurveTo(200, 5, 150, 20, 170, 80);
        context.closePath();
        context.lineWidth = 5;
        context.fillStyle = '#8ED6FF';
        context.fill();
        context.strokeStyle = '#0000ff';
        context.stroke();

        var dataURL = myCanvas.toDataURL("image/png");
        var ext = "png";
        var blob = dataURItoBlob2(dataURL);
        var options = {
            "remoteDir": "records",
            "path": record1.name+"/test."+ext,
            "file": blob,
            "contentType": ext
        };
        //var dataURL = myCanvas.toDataURL();
        //console.log('xxxxxx');
        //console.log(dataURL);
        testPcapi.uploadFile(options).then(function(result){
            console.log(result)
        });
    });*/

    //getAssets
    it('get all images', function(done){
        this.timeout(6000);
        var res = {"records": ["Text (20-10-2014 16h18m18s)/1409925195999.jpg"], "error": 0};

        testPcapi.getAssets().then(function(result){
            try {
                assert.deepEqual(result, res, res.msg);
                finished = true;
                done();
            } catch(x) {
                done(x);
            }
        });
    });

    //deleteItems
    var deleteRecords = function(){
        if(finished === true) {
            testPcapi.deleteItem("records", record1.name).then(function(result) {
                console.log("deletion of "+record1.name+" done");
            });
            testPcapi.deleteItem("records", record2.name).then(function(result) {
                console.log("deletion of "+record2.name+" done");
            });
        }
        else {
            setTimeout(function() {
                deleteRecords();
            }, 2000);
        }
    };

    deleteRecords();

    //exportItem

});