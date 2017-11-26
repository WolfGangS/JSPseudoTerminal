var user = "guest";
var domain = "localhost";
var currentApp = "cmd";


function writeLine(text, id, html) {
    if(typeof html == "undefinded")html = false;
    if(typeof id != "string")id = "line-" + Date.now();
    //console.log("writeLine", text, opts);
    if (typeof text !== "string") text = JSON.stringify(text, null, 2);
    if(html){
        $("<pre>").addClass("line").html(text).attr("id",id).insertBefore(".bottom-line");
    } else {
        $("<p>").addClass("line").text(text).attr("id",id).insertBefore(".bottom-line");
    }
}

function setBusy(set) {
    BUSY = set == true;
    if(BUSY) $(".bottom-line").hide();
    else $(".bottom-line").show();
}
var BUSY = false;
function isBusy() {
    return BUSY;
}

function forceScroll() {
    window.scrollTo(0, document.body.scrollHeight);
    while(window.scrollMaxY > 2000){
        $(".line").first().remove();
    }
}

var cmdApp = new CMDApp();
var historyApp = new HistoryApp(cmdApp);
var getImgApp = new GetImgApp();
var getVidApp = new GetVidApp();

$(document).ready(function() {
    setUser(user);
    setPath(currentPath)
    setDomain(window.location.hostname);

    hookKeys();
    hookPaste();
});

function hookPaste() {
    $('html').bind('paste', function(e) {
        e.preventDefault();
        if (e.originalEvent.clipboardData) {
            var text = e.originalEvent.clipboardData.getData("text/plain");
            $(".current-input").text($(".current-input").text() + text);
        }
    });
}

function hookKeys() {
    $("body").on("keypress", keyPressed);
}

function keyPressed(e) {
    if (isBusy()) return false;
    //console.log(e);
    var txt = $(".current-input").text();
    if (e.key.length == 1 && !e.ctrlKey) {
        $(".current-input").text(txt + e.key);
        return false;
    } else {
        switch (e.key) {
            case "Backspace":
                $(".current-input").text(txt.substring(0, txt.length - 1));
                break;
            case "Enter":
                Apps[currentApp].textIn($(".current-input").text());
                break;
            case "c":
                break;
            case "v":
                return true;
                break;
            default:
                Apps[currentApp].keyIn(e.key, txt);
                break;
        }
        return false;
    }
}

function setUser(str) {
    user = str;
    $(".current-user").text(user);
    setTitle();
}

function setDomain(str) {
    if (str.length > 0) domain = str;
    $(".current-domain").text(domain);
    setTitle();
}

function setTitle() {
    $("title").text(user + "@" + domain);
}