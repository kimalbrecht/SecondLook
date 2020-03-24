/* The following arrays will be used to store the Harvard Art Museums' (HAM) data in ways that are most
helpful for constructing the visualizations; these are global variables, so therefore, I am describing
them here: */

/* An array of objects derived from the HAM API's Object section (human) */
var objectData = [];

/* An array of objects derived from the HAM API's Annotation section (AI) */
var annotationData = [];

/* An array of objects containing data from objectData and annotationData made by
 cross-comparing the imageid fields. */
var artObjects = [];

/* artObjects divided into two sub-arrays, female and male, where gender is used to filter. */
var female = [];
var male = [];

/* An array of strings, specifically, the list of emotions used by AWS Rekognition in its
 facial analysis algorithm for the current selection of art objects. */
var sentiments = [];

/* A map where the key is the emotion and the value is its recurrence. For simplification,
 the emotion with the highest probability per art object is counted toward the sum of recurrence. */
var sentimentsMap = [];

/* A map where the key is the emotion and the value, an arbitrarily assigned color. */
var sentColKey = [];

/* An array of strings, specifically, the hex color values listed in each art object's colors array. */
var colorsHex = [];

/* An array of objects ordered from least to most frequent hex colors in paintings. */
var orderedColorsHex = [];

/* An array of strings, specifically, the hue color listed in each art object's colors array. */
var colorsHue = [];

/* An array of objects ordered from least to most frequent hue colors in paintings. */
var orderedColorsHue = [];

// For transitions, dur is used to update visualization functions.
const dur = 1000; //Milliseconds

/* Load data using d3.queue to prevent unwanted asynchronous activity. */
d3.queue()
    .defer(d3.json, 'data/object.json')
    .defer(d3.json, 'data/annotation.json')
    .await(setup);

//  d3.csv("data/paintings-annotation-AWS.csv", function(data) {
//      console.log(data[1]);
// });

/* setup instantiates global arrays and creates the default visualizations. */
function setup(error, data1, data2) {
    objectData = data1.filter(function (d) {
        return d.colors.length >= 3; //Reduce number of black and white images
    });
    annotationData = data2;
    artObjects = createArtObjects(objectData, annotationData);
    sentColKey = sentimentColorKey();

    // Initialize default look of all visualizations
    wrangleData(artObjects);
    sentimentVisPack(artObjects);
    sentimentVisConcentric(artObjects);
    colorVisualizations("hex", artObjects);
    // colorMosaic(orderedColorsHue[orderedColorsHue.length - 2], artObjects); // Default to "Brown" hue
    colorMosaic(orderedColorsHex[orderedColorsHex.length - 23], artObjects); // Default to forest green color
    sentColLegend();
    sentRadio("all");

    updateVisualizations();
}

/* createArtObjects returns an array of objects containing data from objectData and annotationData
made by cross-comparing the imageid fields. */
function createArtObjects(objectData, annotationData) {

    // var counter = 0;
    // objectData.forEach(function (object) {
    //     Match imageid's between objectData and annotationData to combine records
    //     var contains = false;
    //     for (var i = 0; i < object.imageids.length; i++) {
    //         annotationData.forEach(function (annotation) {
    //             if (object.imageids[i] === annotation.imageid) {
    //                 contains = true;
    //                 counter++;
    //                 object.imageid = annotation.imageid;
    //                 object.faceimageurl = annotation.faceimageurl;
    //                 object.gender = annotation.gender;
    //                 object.emotion = getEmotion(annotation);
    //             }
    //         });
    //         if (contains === true) {
    //             artObjects.push(object);
    //             break;
    //         }
    //     }
    // });
    // console.log("There are this many combined records: " + counter);
    // console.log("Above number should be equal to artObjects length which is: " + artObjects.length);
    // console.log("This is the first record in artObjects:");
    // console.log(artObjects[0]);

    // TO-DO delete once annotationData is fully populated
    for (var i = 0; i < annotationData.length; i++) {
        objectData[i].imageid = annotationData[i].imageid;
        objectData[i].faceimageurl = annotationData[i].faceimageurl;
        objectData[i].gender = annotationData[i].gender;
        objectData[i].emotion = getEmotion(annotationData[i]);
        artObjects.push(objectData[i]);
    }
    console.log("There is a mock combined data set.");
    console.log("This is the first record in artObjects:");
    console.log(artObjects[0]);

    return artObjects;
}

/* getEmotion returns an object containing the annotations's greatest emotion according to the
emotion's Confidence rating along with that Confidence value. getEmotion is a helper function
 for createArtObjects. */
function getEmotion(annotation) {
    var maxConf = d3.max(annotation.emotions, function (d) {
        return d.Confidence;
    });
    var maxEmo;
    annotation.emotions.forEach(function (d) {
        if (d.Confidence === maxConf) {
            maxEmo = d.Type;
        }
    });
    return {
        Confidence: maxConf,
        Value: maxEmo
    }
}

/* sentimentColorKey returns a map where the key is the emotion and the value, an arbitrarily assigned color.
 (Using AWS Rekognition's seven emotions used for facial analysis.) */
function sentimentColorKey() {
    var key = [];
    key["DISGUSTED"] = "#216000";
    key["SAD"] = "#2a3b90"; //"#0c0d49";
    key["CONFUSED"] = "#ffcc99";
    key["ANGRY"] = "#7a2536";
    key["CALM"] = "#AFEEEE"; //"#2a3b90";
    key["HAPPY"] = "#fff853";
    key["SURPRISED"] = "#ac128f"; //"#873778";

    return key;
}

/* wrangleData uses helper functions getSentiments, makeSentimentsMap, makeColors, makeColorsMap, and
*  makeOrderedColors to update global variables according to choice. choice can be artObjects or a
*  variation of it. */
function wrangleData(choice) {

    /* TO-DO: Uncomment this once combined artObjects is potent. Restore first two objects in annotation.json
    (imageid and gender fields) */

    female = artObjects.filter(function (d) {
        return d.gender.Value === "Female";
    });
    male = artObjects.filter(function (d) {
        return d.gender.Value === "Male";
    });

    sentiments = getSentiments(choice);
    sentimentsMap = makeSentimentsMap(choice);

    colorsHex = makeColors(choice, "hex");
    colorsHexMap = makeColorsMap(colorsHex);
    orderedColorsHex = makeOrderedColors(colorsHex, colorsHexMap);

    colorsHue = makeColors(choice, "hue");
    colorsHueMap = makeColorsMap(colorsHue);
    orderedColorsHue = makeOrderedColors(colorsHue, colorsHueMap);
}

/* WrangleData HELPER FUNCTIONS: */

/* getSentiments return an array (set) of sentiments found in data. */
function getSentiments(data) {
    var emotionSet = [];
    for (var j = 0; j < data.length; j++) {
        if (!emotionSet.includes(data[j].emotion.Value)) {
            emotionSet.push(data[j].emotion.Value);
        }
    }
    return emotionSet;
}

/* makeSentimentsMap returns a map where the key is the emotion and the value is its recurrence.
 This function accepts data as an argument which could potentially be the artObjects, female, or male
 arrays where d.emotion.Value is valid. */
function makeSentimentsMap(data) {
    var map = [];

    // Instantiate a map with the sentiments as the keys
    for (var i = 0; i < sentiments.length; i++) {
        map[sentiments[i]] = 0;
    }

    // Record the recurrence for each emotion in the map
    data.forEach(function (d) {
        map[d.emotion.Value] += 1;
    });
    return map;
}

/* makeColors returns an array of strings, specifically, the color (hex or hue based on second argument)
 values listed in each record's colors array. I am using an array and not a set bcs I want to count the
 recurrences and the array's length later on. This function accepts data as an argument which could
 potentially be the artObjects, female, or male arrays where d.color/d.hue could be navigated to as follows. */
function makeColors(data, kind) {

    var colors = [];

    if (kind === "hex") {
        data.forEach(function (record) {
            record.colors.forEach(function (d) {
                colors.push(d.color);
            });
        });
    }

    if (kind === "hue") {
        data.forEach(function (record) {
            record.colors.forEach(function (d) {
                colors.push(d.hue);
            });
        });
    }

    return colors;
}

/* Returns a map where the key is the color and the value is its recurrence. The parameter, colors,
* could potentially be colorsHex or colorsHue */
function makeColorsMap(colors) {
    var map = [];

    // Instantiate a map with the colors as the keys
    for (var i = 0; i < colors.length; i++) {
        map[colors[i]] = 0;
    }
    // Record the recurrence for each color in the map
    for (var j = 0; j < colors.length; j++) {
        map[colors[j]] += 1;
    }

    return map;
}

/* Returns an array of objects ordered from least to most frequent colors in paintings. */
function makeOrderedColors(colors, map) {
    var orderedColors = [];
    var colorsSet = [];

    for (var j = 0; j < colors.length; j++) {
        if (!colorsSet.includes(colors[j])) {
            colorsSet.push(colors[j]);
        }
    }
    for (var i = 0; i < colorsSet.length; i++) {
        var obj = {
            color: colorsSet[i],
            frequency: map[colorsSet[i]]
        };
        orderedColors.push(obj);
    }
    orderedColors.sort(function (a, b) {
        return a.frequency - b.frequency;
    });

    return orderedColors;
}

/* END wrangleData HELPER FUNCTIONS */

/* Update colorVisWheel and colorVisBlock visualizations based on kind. */
function colorVisualizations(kind, data) {
    if (kind === "hue") {
        colorVisBlock(colorsHue, orderedColorsHue, data);
        document.getElementById("mosaic-message-0").innerHTML = "<strong>" +
            "Click on a hue to view paintings where that hue is most prominent:"
        + "</strong>";
        colorVisWheel(orderedColorsHue, data);
    }
    if (kind === "hex") {
        colorVisBlock(colorsHex, orderedColorsHex, data);
        document.getElementById("mosaic-message-0").innerHTML = "<strong>" +
            "Click on a color to view paintings where that color is most prominent:"
        + "</strong>";
        colorVisWheel(orderedColorsHex, data);
    }
}

/* SentRadio updates the user interface to hide/show relevant sentiment radio buttons. */
function sentRadio(value) {

    var result;

    /* Makes visible the sentiment radio buttons for the given sentiments in the selection. For example,
     if female is selected and female has no art objects annotated as disgusting, disgusting is hidden. */
    if (isGender(value)) {
        // Populate result with radio elements for sentiment
        result = document.getElementsByClassName("radio sent");
        var includeEmotion;

        for (var k = 0; k < result.length; k++) {
            includeEmotion = false;
            for (var l = 0; l < sentiments.length; l++) {
                result[k].classList.forEach(function (d) {
                    if (d === sentiments[l]) {
                        includeEmotion = true;
                    }
                });
            }
            if (!includeEmotion) {
                result[k].style.display = "none";
            } else {
                result[k].style.display = "inline";
            }
        }
    }

    /* Makes visible the gender radio buttons for the selected sentiment. For example, if disgusting is selected
     but no female art objects are annotated as disgusting, female is hidden. */
    if (isEmotion(value)) {
        if (value === "all_sent") {
            sentRadio("all");
        }
        // Populate result with radio elements for gender
        result = document.getElementsByClassName("radio gen");
        var includeFemale = hasEmo(value, female);
        var includeMale = hasEmo(value, male);

        for (var i = 0; i < result.length; i++) {
            result[i].classList.forEach(function (d) {
                if (d === "female") {
                    if (!includeFemale) {
                        result[i].style.display = "none";
                    } else {
                        result[i].style.display = "inline";
                    }
                }
                if (d === "male") {
                    if (!includeMale) {
                        result[i].style.display = "none";
                    } else {
                        result[i].style.display = "inline";
                    }
                }
            });
        }
    }
}

/* hasEmo returns a boolean for whether or not data has art objects annotated with the given emotion or emo */
function hasEmo(emo, data) {
    if (emo === "all_sent") {
        return true;
    }
    else {
        var hasEmo = false;

        for (var d = 0; d < data.length; d++) {
            if (data[d].emotion.Value === emo) {
                hasEmo = true;
            }
            if (hasEmo === true) {
                return hasEmo;
            }
        }
        return hasEmo;
    }
}

/* updateVisualizations "listens" for user-initiated events then updates the visualizations. */
function updateVisualizations() {

    // Set default values
    var data = artObjects;
    var gender = "all";
    var emotion = "all_sent";
    var radioColor = "hex";

    // Event listener coordinates filtering across all visualizations
    d3.selectAll("input")
        .on("change", function() {
            var value = this.value;

            if (isGender(value)) {
                gender = value;
            }
            if (isEmotion(value)) {
                emotion = value;
            }

            if (value === "hue" || value === "hex") {
                radioColor = value;
            }
            // if (value !== "hue" && value !== "hex") {
            data = updateData(value, gender, emotion);
            wrangleData(data);

            // Updates visualizations with wrangled data
            sentimentVisPack(data);
            sentimentVisConcentric(data);
            colorVisualizations(radioColor, data);
            sentColLegend();
            sentRadio(value);

            // Update radio interfaces
            updateRadioInterfaces(value);
        });
}

/* isGender returns a boolean value for whether or not radio input is a gender selection */
function isGender(value) {
    var isGender = false;

    if (value === "all" || value === "female" || value === "male") {
        isGender = true;
    }

    return isGender;
}

/* isEmotion returns a boolean value for whether or not radio input is an emotion selection */
function isEmotion(value) {
    var allEmotions = [];
    annotationData[0].emotions.forEach(function (d) {
        allEmotions.push(d.Type);
    });
    var isEmotion = false;
    for (var j = 0; j < allEmotions.length; j++) {
        if (value === allEmotions[j] || value === "all_sent") {
            isEmotion = true;
        }
    }
    return isEmotion;
}

/* updateData returns artObjects as a new filtered array for updating all visualizations according to the
*  user's selection for gender and emotion.  */
function updateData(value, gender, emotion) {

    /* Filter data according to gender and emotion */
    var data;

    if (gender === "all" && emotion === "all_sent") {
        data = artObjects;
    }
    if (gender === "female" && emotion === "all_sent") {
        data = female;
    }
    if (gender === "male" && emotion === "all_sent") {
        data = male;
    }
    if (gender === "all" && emotion !== "all_sent") {
        data = artObjects.filter(function (d) {
            return d.emotion.Value === emotion;
        });
    }
    if (gender === "female" && emotion !== "all_sent") {
        data = female.filter(function (d) {
            return d.emotion.Value === emotion;
        });
    }
    if (gender === "male" && emotion !== "all_sent") {
        data = male.filter(function (d) {
            return d.emotion.Value === emotion;
        });
    }
    return data;
}

/* updateRadioInterfaces visually updates radio buttons across document (page). For example, if the user
 selects female then all female radio buttons become checked. */
function updateRadioInterfaces(value) {
    var className = "radio " + value;
    var buttons = document.getElementsByClassName(className);

    // Check matching radio buttons across page
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].control.checked = true;
    }
}











// function brushed() {
//
//     // TO-DO: React to 'brushed' event
//     var selectionRange = d3.brushSelection(d3.select(".brush").node());
//     var selectionDomain = selectionRange.map(timeline.x.invert);
// }

//Code for before I added sent to html labels
// var selection = document.getElementsByClassName("radio");
// var result = [];
// for (var i = 0; i < selection.length; i++) {
//     for (var j = 0; j < allEmotions.length; j++) {
//         selection[i].classList.forEach(function (d) {
//             if (d === allEmotions[j]) {
//                 result.push(selection[i]);
//             }
//         });
//     }
// }

// For retrieving all sentiments
// var allEmotions = [];
// allEmotions.push("all_sent");
// annotationData[0].emotions.forEach(function (d) {
//     allEmotions.push(d.Type);
// });

// var apiEndpointBaseURL = "https://api.harvardartmuseums.org/annotation";
// var queryString = $.param({
//     apikey: "ed473380-f7f7-11e9-ac89-7bb693659e8d",
//     q: "type:face"
// });
//
// $.getJSON(apiEndpointBaseURL + "?" + queryString, function(data) {
//     console.log(data);
// });