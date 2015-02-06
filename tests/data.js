var record1 = {
    "type": "Feature",
    "geometry": {
        "type": "Point",
        "coordinates": [
            5.366076115152644,
            51.80957813315172
        ]
    },
    "properties": {
        "editor": "text.edtr",
        "fields": [],
        "timestamp": "2014-08-20T14:18:25.514Z"
    },
    "name": "Text (20-08-2014 16h18m18s)"
};

var record2 = {
    "type": "Feature",
    "geometry": {
        "type": "Point",
        "coordinates": [
            5.466076115152644,
            51.90957813315172
        ]
    },
    "properties": {
        "editor": "myEditor.edtr",
        "fields": [
                   {
                    "id": "fieldcontain-image-1",
                    "val": "1409925195999.jpg",
                    "label": "Image"
                    }
                ],
        "timestamp": "2014-10-20T14:18:25.514Z"
    },
    "name": "Text (20-10-2014 16h18m18s)"
};

var editor1 = {
    name: "ttestt",
    editor: [ '<div class="fieldcontain" id="fieldcontain-text-1">',
             '<label for="form-text-1">Title</label>',
             '<input name="form-text-1" id="form-text-1" type="text" required="" placeholder="Placeholder" maxlength="10">',
             '</div>',
             '<div class="fieldcontain" id="fieldcontain-image-1">',
             '<div class="button-wrapper button-camera">',
             '<input name="form-image-1" id="form-image-1" type="file" accept="image/png" capture="camera" required="" class="camera">',
             '<label for="form-image-1">Take</label>',
             '</div></div>']
};

var editor2 = {
    name: "myEditor",
    editor: ['<div class="fieldcontain" id="fieldcontain-text-1">',
             '<label for="form-text-1">Title</label>',
             '<input name="form-text-1" id="form-text-1" type="text" required="" placeholder="Placeholder" maxlength="10">',
             '</div>',
             '<div class="fieldcontain" id="fieldcontain-textarea-1">',
             '<label for="form-textarea-1">Description</label>',
             '<textarea name="form-textarea-1" id="form-textarea-1" placeholder="Placeholder" required="" readonly="readonly"></textarea>',
             '</div>']
};