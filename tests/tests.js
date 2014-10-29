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

//function dataURItoBlob(dataURI) {
//    // convert base64/URLEncoded data component to raw binary data held in a string
//    var byteString;
//    if (dataURI.split(',')[0].indexOf('base64') >= 0)
//        byteString = atob(dataURI.split(',')[1]);
//    else
//        byteString = unescape(dataURI.split(',')[1]);
//
//    // separate out the mime component
//    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
//
//    // write the bytes of the string to a typed array
//    var ia = new Uint8Array(byteString.length);
//    for (var i = 0; i < byteString.length; i++) {
//        ia[i] = byteString.charCodeAt(i);
//    }
//
//    return new Blob([ia], {type:mimeString});
//}
//
//function b64toBlob(b64Data, contentType, sliceSize) {
//    contentType = contentType || '';
//    sliceSize = sliceSize || 512;
//
//    var byteCharacters = atob(b64Data);
//    var byteArrays = [];
//
//    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
//        var slice = byteCharacters.slice(offset, offset + sliceSize);
//
//        var byteNumbers = new Array(slice.length);
//        for (var i = 0; i < slice.length; i++) {
//            byteNumbers[i] = slice.charCodeAt(i);
//        }
//
//        var byteArray = new Uint8Array(byteNumbers);
//
//        byteArrays.push(byteArray);
//    }
//
//    var blob = new Blob(byteArrays, {type: contentType});
//    return blob;
//}

function preparePCAPI(){
    if(!("uid" in test_pcapi.getParameters())){
        test_pcapi.loginCloud();
    }
    else{
        var token = test_pcapi.getParameters().oauth_token;
        stop();
        test_pcapi.checkLogin(function(success, data){
            console.log(data);
            start();
        });
    }
}

//the providers
var providers = ["dropbox", "local"];

//initialize pcapi
var test_pcapi = pcapi();
//set the url, version
test_pcapi.init(config.options[provider]);
//set the provider
test_pcapi.setProvider(provider);
//set the userid
test_pcapi.setCloudLogin(test_pcapi.getParameters()["oauth_token"]);

//UNIT TESTS
module('Providers', {
    setup: preparePCAPI
});
test("check PCAPI URL", function(assert){
    assert.equal(config.options[provider].url+"/"+config.options[provider].version+"/pcapi", test_pcapi.getCloudProviderUrl(), "URL is right");
});

asyncTest("Test Providers", function(assert){
    test_pcapi.getProviders(function(success, data){
        assert.ok(success, "The api call for providers is working");
        for(var key in data){
            for(var i=0; i<providers.length;i++){
                if(key === providers[i]){
                    assert.ok(true, "The provider "+key+ " was found");
                }
            }
        }
        start();
    });
});


test("Check Provider", function(assert){
    assert.equal(provider, test_pcapi.getProvider(), "The provider is "+test_pcapi.getProvider());
})

test("Check PCAPI Login", function(assert){
    
    
    //var loginCloud = function(cb){
    //    var allowStr = 'document.querySelector(\'button[name="allow_access"]\').click();';
    //    var loginStr = 'if(document.getElementsByName("login_email").length > 0){document.getElementsByName("login_email")[1].value="' + user.name + '";document.getElementsByName("login_password")[1].value="' + user.pass + '";document.querySelector(\'button[type="submit"]\').click();}else{}'; // jshint ignore:line
    //    console.log(loginStr)
    //
    //    test_pcapi.loginCloud(
    //        function(){
    //            console.debug("Logged into Dropbox");
    //            cb();
    //        },
    //        function(cbrowser){
    //            setTimeout(function(){
    //                cbrowser.executeScript(
    //                    {
    //                        code: loginStr
    //                    },
    //                    function(){
    //                        setTimeout(function(){
    //                            cbrowser.executeScript(
    //                                {
    //                                    code: allowStr
    //                                },
    //                                function(){
    //                                });
    //                        }, 3000); // wait for authorise page
    //                    });
    //            }, 3000); // wait for child browser to load
    //        }
    //    );
    //};
    //loginCloud(function(){
    //    console.log("hurray")
    //});

    var token = test_pcapi.getParameters().oauth_token;
    assert.ok(true, "The user has a token");
    asyncTest("Is login valid?", function(assert){
        test_pcapi.checkLogin(function(userId){
            assert.equal(userId, token, "The login is valid");
            start();
        });
    });
});

test("Check UserId", function(assert){
    assert.equal(test_pcapi.getParameters()["oauth_token"], test_pcapi.getUserId(), "The userid is the right one");
});

module("Records", {
    setup: preparePCAPI
});

//test save record
asyncTest("Save/Rename/Update/Delete record", function(assert){

    //save record1
    test_pcapi.saveItem("records", record1, function(success, data){
        //check if record1 was saved right
        assert.ok(success, "Record1 is saved");
        assert.equal(data.error, 0, "There was no error");
        assert.equal(data.path, "/records/"+record1.name+"/record.json", "It was save in the right path");

        //change the editor name of record1
        record1.properties.editor = "text1.edtr";
        //update record1 with PUT request
        test_pcapi.updateItem("records", record1, "record.json", function(success, data){
            //get record1 from cloud
            test_pcapi.getItem("records", record1.name, 'json', function(success, data){
                //check if it has been updated
                assert.ok(success, "The GET request of the record is working");
                assert.equal(record1.properties.editor, data.properties.editor, "The record has been updated");
            });
        });

        //save record1 again to see if it's renamed
        stop();
        test_pcapi.saveItem("records", record1, function(success, data){
            assert.equal(data.path, "/records/"+record1.name+" (1)/record.json", "It was renamed to "+data.path);

            //save record2
            stop();
            test_pcapi.saveItem("records", record2, function(success, data){
                assert.ok(success, "Record2 is saved");
                assert.equal(data.error, 0, "There was no error");

                //test get all records
                stop();
                test_pcapi.getItems("records", "", undefined, function(success, data){

                    assert.ok(success, "The get records is working");

                    //test filtering by editor
                    stop();
                    test_pcapi.getItems("records", "", {"filter":"editor", "id": "myEditor.edtr"}, function(success, data){
                        assert.ok(success, "The filter records is working");
                        
                        stop();
                        test_pcapi.getItem("records", record1.name, "json", function(success, data){
                            assert.ok(success, "The item exists");
                            assert.equal(data.properties.timestamp, "2014-08-20T14:18:25.514Z", "The property is the same");
                            
                            //TO-DO: investigate why is not working
                            //var dataURL = canvas.toDataURL('image/jpeg', 0.5);
                            //var blob = b64toBlob(image, "image/jpg");
                            //var blob = new Blob([image], {
                            //    type: "image",
                            //    filename: "test",
                            //    name: "test.jpg"
                            //});
                            //test_pcapi.uploadFile('records/'+record1.name, "test.jpg", "aaaaaaaaaaaa", function(success, data){
                            //    console.log(data)
                            //});
                            stop();
                            test_pcapi.getAssets(function(success, data){
                                assert.equal(3, data.records.length, "There is only one record with images");
                                //delete records
                                stop();
                                test_pcapi.deleteItem("records", record1, function(success, data){
                                    assert.ok(true, "Record was deleted");
                                    start();
                                });

                                stop();
                                record1.name = "Text (20-08-2014 16h18m18s) (1)";
                                test_pcapi.deleteItem("records", record1, function(success, data){
                                    assert.ok(true, "Record was deleted");
                                    start();
                                });

                                stop();
                                test_pcapi.deleteItem("records", record2, function(success, data){
                                    assert.ok(true, "Record was deleted");
                                    start();
                                });
                                start();
                            })
                            start();
                        });
                        start();
                    });

                    start();
                });
                start();
            });
            start();
        });
        start();
    });
});

module("Editors", {
    setup: preparePCAPI
});
//test save editor
asyncTest("Save/Rename/Delete editor", function(assert){

    //save first editor

    test_pcapi.saveItem("editors", editor1, function(success, data){
        assert.ok(success, "The editor is saved");
        assert.equal(data.error, 0, "There was no error");
        assert.equal(data.path, "/editors/"+editor1.name+".edtr", "It was save in the right path");

        stop();
        //save editor1 again to check if rename works
        test_pcapi.saveItem("editors", editor1, function(success, data){
            assert.equal(data.path, "/editors/"+editor1.name+" (1).edtr", "It was renamed to "+data.path);

            stop();
            //get all editors
            test_pcapi.getItems("editors", "", undefined, function(success, data){

                assert.equal(0, data.error, "The getItems request is succesful");
                for(var i=0; i<data.metadata.length; i++){
                    if(data.metadata[i] === "/editors/"+editor1.name+".edtr"){
                        assert.ok(true, "The editor "+editor1.name+ "is in the list of editors");
                    }
                }
                
                stop();
                //test getItem for an editor
                test_pcapi.getItem("editors", editor1.name+".edtr", "html", function(success, data){
                    assert.ok(success, "The item exists");

                    //delete all editors
                    stop();
                    test_pcapi.deleteItem("editors", editor1.name, function(success, data){
                        assert.ok(true, "Editor was deleted");
                        start();
                    });
                    
                    stop();
                    test_pcapi.deleteItem("editors", editor1.name+" (1)", function(success, data){
                        assert.ok(true, "Editor was deleted");
                        start();
                    });
                    
                    stop();
                    test_pcapi.deleteItem("editors", editor2.name, function(success, data){
                        assert.ok(true, "Editor was deleted");
                        start();
                    });
                    start();
                });
                start();
            });
            start();
        });
        start();
    });
});