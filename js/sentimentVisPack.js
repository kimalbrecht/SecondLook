// SVG drawing areas
var marginPack = {top: 25, right: 45, bottom: 25, left: 45};
var widthPack = 600 - marginPack.left - marginPack.right;
var heightPack = 600 - marginPack.top - marginPack.bottom;
var svgPack = d3.select("#sentimentVisPack").append("svg")
    .attr("width", widthPack + marginPack.left + marginPack.right)
    .attr("height", heightPack + marginPack.top + marginPack.bottom)
    .append("g")
    .attr("class", "chart")
    .attr("transform", "translate(" + marginPack.left + "," + marginPack.top / 2 + ")");

function sentimentVisPack(data) {
    console.log("vis un");
    var width = widthPack;
    var height = heightPack;

    var hierarchyData = getHierarchyData(data);

    var pack = d3.pack()
        .size([width, height])
        .padding(3);

    var root = d3.hierarchy(hierarchyData);

    var nodes = pack(root).descendants();

    var xAdjust = 0;
    var yAdjust = 0;

    // Here I'm connecting each node to an ID. So d3 'knows' about ach point.
    var updateCir = svgPack
        .selectAll(".cir")
        .data(nodes, function(d,i) { 
            return d.data.id; 
        });

    // console.log(nodes)

    updateCir
        .transition()
        .duration(dur)
        .attr("cx",function(d) {
            return d.x + xAdjust;
        })
        .attr("cy",function(d) {
            return d.y + yAdjust;
        })
        .attr("r",function(d) {
            return d.r;
        })
        .style("fill", function (d) {
            if (d.data.name !== "RootNode" && d.data.name !== undefined) {
                return sentColKey[d.data.name];
            }
            else {
                // return "#F0F0F0";
                return "white";
            }
        })
        .style("stroke", function (d) {
            if (d.data.name !== "RootNode" && d.data.name !== undefined) {
                return "black";
            }
            else {
                // return "#F0F0F0";
                return "white";
            }
        })
        .style("stroke-width", 0.25);


    var newCircles = updateCir.enter()
        .append("circle")
        .attr("class", "cir")
        .attr("cx", width/2)
        .attr("cy", height/2)
        .attr("r", 0)
        .style("fill", function (d) {
            if (d.data.name !== "RootNode" && d.data.name !== undefined) {
                return sentColKey[d.data.name];
            }
            else {
                // return "#F0F0F0";
                return "white";
            }
        })
        .style("stroke", function (d) {
            if (d.data.name !== "RootNode" && d.data.name !== undefined) {
                return "black";
            }
            else {
                // return "#F0F0F0";
                return "white";
            }
        })

    newCircles
        .transition()
        .duration(dur)
        .attr("cx",function(d) {
            return d.x + xAdjust;
        })
        .attr("cy",function(d) {
            return d.y + yAdjust;
        })
        .attr("r",function(d) {
            return d.r;
        })
        .style("stroke-width", 0.25)

    newCircles
        .on("mouseover", function(d) {
            if (d.children === undefined) {
                var image = document.getElementById("hover-img-pack");
                image.src = d.data.url;
                document.getElementById("title").innerHTML =
                    "<em>" + d.data.title + "</em>";
                document.getElementById("artist").innerHTML =
                    "<strong>Artist: </strong>" + d.data.artist;
                document.getElementById("century").innerHTML =
                    "<strong>Century: </strong>" + d.data.century;
                document.getElementById("emotion").innerHTML =
                    "<strong>Dominant sentiment: </strong>" + d.data.name.toLowerCase()
                    + " (" + Math.floor(d.data.value) + "% confidence)";
                document.getElementById("gender").innerHTML =
                    "<strong>Gender: </strong>" + d.data.gender.toLowerCase()
                    + " (" + Math.floor(d.data.gconfidence) + "% confidence)";
            }
        })
        .on("mouseout", function(d) {
            if (d.data.name === undefined) {
                var image = document.getElementById("hover-img-pack");
                image.src = "img/hamlogo.png";
                document.getElementById("title").innerHTML = "";
                document.getElementById("artist").innerHTML = "";
                document.getElementById("century").innerHTML =
                    "<strong>Hover over circles <br> to view paintings</strong>";
                document.getElementById("emotion").innerHTML = "";
                document.getElementById("gender").innerHTML = "";
            }
        });

        updateCir.exit().remove();

}

/* Reformat data for use with d3.hierarchy(). (Ironically, data must be in a specific hierarchy format
*  in order to be passed to d3.hierarchy() which returns yet another hierarchy format for use with
*  d3.pack(). */
function getHierarchyData(data) {

    var sentimentsObjects = [];
    for (var i = 0; i < sentiments.length; i++) {
        var children = [];
        for (var j = 0; j < data.length; j++) {
            if (sentiments[i] === data[j].emotion.Value) {
                var child = {
                    "name": data[j].emotion.Value,
                    "id": data[j].rank,
                    "value": data[j].emotion.Confidence,
                    "gender": data[j].gender.Value,
                    "gconfidence": data[j].gender.Confidence,
                    "children": undefined,
                    "title": data[j].title,
                    "artist": data[j].artist,
                    "century": data[j].century,
                    "url" : data[j].primaryimageurl
                };
                children.push(child);
            }
        }
        var obj = {
            "name": undefined,
            "id": 'obj'+i,
            "value": sentimentsMap[sentiments[i]],
            "children": children
        };
        sentimentsObjects.push(obj);
    }
    return {"name": "RootNode",
        "id": "root",
        "value": data.length,
        "children": sentimentsObjects
    };
}