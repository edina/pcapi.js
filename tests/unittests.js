"use strict"

var config = {
    options: {
        "local": {
            "url": "http://example.com",
            "version": "1.3",
            "userId": "00000000-0000-0000-0000-000000000000"
        },
        "dropbox":{
            "url": "http://dlib-terzis.ucs.ed.ac.uk:8150",
            "version": "1.3"
        }
    }
};

//chai.use(chaiAsPromised);
var assert = chai.assert;

var providers = ['local', 'dropbox'];
var testPcapi = pcapi;

//initialize pcpapi with local provider
testPcapi.init(config.options[providers[0]]);
//set the provider
testPcapi.setProvider(providers[0]);
//set the userid
testPcapi.setCloudLogin(config.options[providers[0]]["userId"]);



describe('#checkProviders', function(){
    var server, fakeData;

    beforeEach(function(){
        fakeData = {"dropbox": ["oauth", "search", "synchronize", "delete"], "local": ["search", "synchronize", "delete"]};
    });

    it('check for the providers', function(){
        sinon.stub(testPcapi, 'getProviders').returns(Promise.resolve(fakeData));
        expect(testPcapi.getProviders()).to.eventually.have.keys(providers);
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
        expect(testPcapi.getUserId()).to.equal(config.options[providers[0]]["userId"]);
        done();
    });
});


//buildUrls
describe('#URLS', function(){
    //base url
    it('base url check', function(done){
        var url = "http://example.com";
        assert.equal(testPcapi.getBaseUrl(), url);
        done();
    });

    //cloud provider url
    it('cloud provider url check', function(done){
        var url = "http://example.com/1.3/pcapi";
        assert.equal(testPcapi.getCloudProviderUrl(), url);
        done();
    });

    //buildURL
    it('buildURL, works for editors, records', function(done){
        var url = "http://example.com/1.3/pcapi/records/local/00000000-0000-0000-0000-000000000000/Text (20-08-2014 16h18m18s)";
        assert.equal(testPcapi.buildUrl("records", record1.name), url);
        done();
    });

    //buildUserUrl
    it('buildUserURL, works for editors, records', function(done){
        var url = "http://example.com/1.3/pcapi/records/local/xxxxxx/Text (20-08-2014 16h18m18s)";
        assert.equal(testPcapi.buildUserUrl("xxxxxx", "records", record1.name), url);
        done();
    });

    //buildFSUrl
    it('buildFSURL, works for any folder', function(done){
        var url = "http://example.com/1.3/pcapi/fs/local/00000000-0000-0000-0000-000000000000/records/Text (20-08-2014 16h18m18s)";
        assert.equal(testPcapi.buildFSUrl("records", record1.name), url);
        done();
    });

    //buildFSUserUrl
    it('buildFSUserURL, works for any folder', function(done){
        var url = "http://example.com/1.3/pcapi/fs/local/xxx/records/Text (20-08-2014 16h18m18s)";
        assert.equal(testPcapi.buildFSUserUrl("xxx", "records", record1.name), url);
        done();
    });
});


describe('#Record', function(){
    var fakeData;

    it('upload a fresh record', function(done){
        fakeData = {"msg": "File uploaded", "path": "/records/"+record1.name+"/record.json", "error": 0};
        sinon.stub(testPcapi, 'saveItem').returns(Promise.resolve(fakeData));
        var options = {
            "remoteDir": "records",
            "path": record1.name,
            "data": record1
        };

        testPcapi.saveItem(options).then(function(result){
            try {
                assert.deepEqual(result, fakeData);
                testPcapi.saveItem.restore(); 
                done();
            } catch(x) {
                done(x);
            }
        });
    });

    //check the saveItem for when the userId is not email or HEX
    it('upload a fresh record with invalid userId', function(done){
        fakeData = {msg: "'Illegal userid: xxx -- should either HEX or EMAIL'", error: 1};
        sinon.stub(testPcapi, 'saveItem').returns(Promise.resolve(fakeData));
        var options = {
            "remoteDir": "records",
            "path": record1.name,
            "data": record1,
            "userId": "xxx"
        };


        testPcapi.saveItem(options).then(function(result){
            try {
                assert.deepEqual(result, fakeData);
                testPcapi.saveItem.restore(); 
                done();
            } catch(x) {
                done(x);
            }
        });
    });
    
    it('upload an existing record', function(done){
        fakeData = {"msg": "File uploaded", "path": "/records/"+record1.name+" (1)/record.json", "error": 0};
        var res = {"msg": "File uploaded", "path": "/records/"+record1.name+"/record.json", "error": 0};
        sinon.stub(testPcapi, 'saveItem').returns(Promise.resolve(fakeData));
    
        var options = {
            "remoteDir": "records",
            "path": record1.name,
            "data": record1
        };
        testPcapi.saveItem(options).then(function(result){
            if(result.msg === res.msg && result.error === 0 && result.path !== res.path){
                testPcapi.saveItem.restore(); 
                assert.ok(true, "The record is uploaded but renamed");
                done();
            }
        }, function(error){
            throw error;
            done();
        });
    });

    it('delete a record', function(done){
        var fakeData = {msg: "records/Text (20-08-2014 16h18m18s) (1) deleted", error: 0};
        sinon.stub(testPcapi, 'deleteItem').returns(Promise.resolve(fakeData));
        testPcapi.deleteItem("records", record1.name+ " (1)").then(function(result) {
            //always write catch, otherwise is not catching the error and gives timeout error
            try {
                assert.deepEqual(result, fakeData, fakeData.msg);
                testPcapi.deleteItem.restore(); 
                done();
            } catch (x) {
                done(x);
            }
        }, function(error){
            throw error;
            done(error)
        });
    });

    //update record
    it('update a record', function(done){
        var fakeData = {"msg": "File uploaded", "path": "/records/Text (20-08-2014 16h18m18s)/record.json", "error": 0};
        sinon.stub(testPcapi, 'updateItem').returns(Promise.resolve(fakeData));
        record1.properties.editor = "text1.edtr";
        var updateOptions = {
            "remoteDir": "records",
            "path": record1.name+"/record.json",
            "data": record1
        };
        testPcapi.updateItem(updateOptions).then(function(result){
            try {
                assert.deepEqual(result, fakeData, fakeData.msg);
                testPcapi.updateItem.restore(); 
                done();
            } catch(x) {
                done(x);
            }
        }, function(error){
            throw(error);
            done();
        });
    });

    //get All records (getItems/getFSItems)
    it('get all records', function(done){
        var options = {
            "remoteDir": "records"
        };
        var fakeData = {"records": [{"Text (20-10-2014 16h18m18s)": {"geometry": {"type": "Point", "coordinates": [5.466076115152644, 51.90957813315172]}, "type": "Feature", "properties": {"fields": [{"id": "fieldcontain-image-1", "val": "1409925195999.jpg", "label": "Image"}], "editor": "myEditor.edtr", "timestamp": "2014-10-20T14:18:25.514Z"}, "name": "Text (20-10-2014 16h18m18s)"}}, {"Text (20-08-2014 16h18m18s)": {"geometry": {"type": "Point", "coordinates": [5.366076115152644, 51.80957813315172]}, "type": "Feature", "properties": {"fields": [], "editor": "text1.edtr", "timestamp": "2014-08-20T14:18:25.514Z"}, "name": "Text (20-08-2014 16h18m18s)"}}], "error": 0};
        sinon.stub(testPcapi, 'getItems').returns(Promise.resolve(fakeData));

        testPcapi.getItems(options).then(function(result){
            try {
                assert.deepEqual(result, fakeData, fakeData.msg);
                testPcapi.getItems.restore(); 
                done();
            } catch(x) {
                done(x);
            }
        });
    });

    //filter Records (getItems)
    it('filter records', function(done){
        var options = {
            "remoteDir": "records",
            "extras": "",
            "filters": {"filter":"editor", "id": "myEditor.edtr"}
        };
        var fakeData = {"records": [{"Text (20-10-2014 16h18m18s)": {"geometry": {"type": "Point", "coordinates": [5.466076115152644, 51.90957813315172]}, "type": "Feature", "properties": {"fields": [{"id": "fieldcontain-image-1", "val": "1409925195999.jpg", "label": "Image"}], "editor": "myEditor.edtr", "timestamp": "2014-10-20T14:18:25.514Z"}, "name": "Text (20-10-2014 16h18m18s)"}}], "error": 0};
        sinon.stub(testPcapi, 'getItems').returns(Promise.resolve(fakeData));

        testPcapi.getItems(options).then(function(result){
            try {
                assert.deepEqual(result, fakeData, fakeData.msg);
                testPcapi.getItems.restore();
                done();
            } catch(x) {
                done(x);
            }
        });
    });

    //get FS items
    it('get fs all records', function(done){
        var fakeData = {"metadata": ["/records/Text (20-10-2014 16h18m18s)", "/records/Text (20-08-2014 16h18m18s)"], "error": 0}
        sinon.stub(testPcapi, 'getFSItems').returns(Promise.resolve(fakeData));

        testPcapi.getFSItems('records').then(function(result) {
            try {
                assert.deepEqual(result, fakeData, fakeData.msg);
                testPcapi.getFSItems.restore();
                done();
            } catch(x) {
                done(x);
            }
        });
    });


    //getItem
    it('get item', function(done){
        var fakeData = {
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
        sinon.stub(testPcapi, 'getItem').returns(Promise.resolve(fakeData));

        var options = {
            "remoteDir": "records",
            "item": record1.name
        };
        testPcapi.getItem(options).then(function(result){
            try {
                assert.deepEqual(result, fakeData, "The record is the right one");
                testPcapi.getItem.restore();
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
        sinon.stub(testPcapi, 'getFSItem').returns(Promise.resolve(fakeData));

        testPcapi.getFSItem(options).then(function(result){
            try {
                assert.deepEqual(result, fakeData, "The record is the right one");
                testPcapi.getFSItem.restore();
                done();
            } catch(x) {
                done(x);
            }
        });
    });

    //getAssets
    it('get all images', function(done){
        var fakeData = {"records": ["Text (20-10-2014 16h18m18s)/1409925195999.jpg"], "error": 0};
        sinon.stub(testPcapi, 'getAssets').returns(Promise.resolve(fakeData));

        testPcapi.getAssets().then(function(result){
            try {
                assert.deepEqual(result, fakeData, fakeData.msg);
                testPcapi.getAssets.restore();
                done();
            } catch(x) {
                done(x);
            }
        });
    });
});
