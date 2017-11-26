var Apps = {};

function ArgStringSplit(text) {
    return text.match(/\\?.|^$/g).reduce((p, c) => {
        if (c === '"') {
            p.quote ^= 1;
        } else if (!p.quote && c === ' ') {
            p.a.push('');
        } else {
            p.a[p.a.length - 1] += c.replace(/\\(.)/, "$1");
        }
        return p;
    }, { a: [''] }).a;
}

class AppArgs {
    constructor(args,app) {
        this.raw = [];
        this.options = {};
        for (var i = 0; i < args.length; i++) {
            var arg = args[i].trim();
            if (arg.length > 0) {
                this.raw.push(arg);
                var na = i < (args.length - 1) ? args[i + 1] : "";
                if (arg.substring(0, 1) == "-") {
                    this.options[arg.substring(1)] = na;
                }
            }
        }
    }
}

class BaseApp {
    constructor() {
        var n = this.constructor.name;
        Apps[n.substring(0, n.length - 3).toLowerCase()] = this;
    }

    call(args, cb) {
        console.log(this.constructor.name, "call", args);
        cb();
    }

    textIn(text) {
        console.log(this.constructor.name, "textIn", text);
    }

    keyIn(key, text) {
        console.log(this.constructor.name, "keyIn", key, text);
    }
}

class GetImgApp extends BaseApp {
    call(args, cb) {
        var colour = args.options.hasOwnProperty("c") || args.options.hasOwnProperty("colour");
        var size = args.options.hasOwnProperty("s") ? parseInt(args.options.s) : 100;
        size = Math.abs(size);
        if (size < 5) size = 5;
        if (size > 500) size = 500;
        var img = $("<img>").attr({ src: args[0], id: "GetImgApp-Img", style: "display:none;", crossOrigin: "anonymous" }).on("error", function(e) {
            writeLine("Image failed to load.");
            cb();
            delete GetImgApp.jscii;
            GetImgApp.jscii = null;
            $("#GetImgApp-Img").remove();
        }).appendTo("body");
        GetImgApp.jscii = new Jscii({
            width: size,
            color: colour,
            el: document.getElementById("GetImgApp-Img"),
            fn: function(str) {
                writeLine(str, null, true);
                $("#GetImgApp-Img").remove();
                cb();
                delete GetImgApp.jscii;
                GetImgApp.jscii = null;
            }
        });
    }
}
GetImgApp.jscii = null;

class GetVidApp extends BaseApp {
    call(args, cb) {
        if (GetVidApp.jsvid !== null) {

            if (args[0] == "pause") {
                GetVidApp.jsvid.pause().el.pause();
                cb();
                return;
            } else if (args[0] == "play") {
                GetVidApp.jsvid.play().el.play();
                cb();
                return;
            }

            GetVidApp.jsvid.pause();
            delete GetVidApp.jsvid;
            GetVidApp.jsvid = null;
            $("#GetVidApp-Vid").remove();

            if (args[0] == "stop") {
                cb();
                return;
            }
        }
        GetVidApp.first = true;
        var colour = args.hasOwnProperty("c") || args.hasOwnProperty("colour");
        var size = args.hasOwnProperty("s") ? parseInt(args.s) : 100;
        size = Math.abs(size);
        if (size < 5) size = 5;
        if (size > 500) size = 500;
        var id = "getvid-" + Date.now();

        var vid = $("<video>").attr({ id: "GetVidApp-Vid", style: "display:none;", crossOrigin: "anonymous", autoplay: "true" });
        vid.append($("<source>").attr({ src: args[0], type: "video/mp4" }).on("error", function() {
            $("#GetVidApp-Vid").remove();
            GetVidApp.jsvid.pause();
            delete GetVidApp.jsvid;
            GetVidApp.jsvid = null;
        }));
        vid.appendTo("body");


        writeLine(" ", id + "-vid", true);
        cb();
        GetVidApp.jsvid = new Jscii({
            color: colour,
            width: size,
            container: document.getElementById(id + "-vid"),
            el: document.getElementById("GetVidApp-Vid"),
            fn: function() {
                if (GetVidApp.first) {
                    GetVidApp.first = false;
                    forceScroll();
                }
            }
        });
    }
}

GetVidApp.jsvid = null;
GetVidApp.first = false;

function writeUserLine(text) {
    var u = $("<span>").addClass("user").text(user);
    var d = $("<span>").addClass("domain").text(domain);
    var p = $("<span>").addClass("path").text(path);
    var i = $("<span>").addClass("input").text(text);
    var l = $("<p>").addClass("line");
    l.append(u).append(d).append(p).append(i);
    l.insertBefore(".bottom-line");
}

class CMDApp extends BaseApp {

    constructor() {
        super();
        this.history = [];
        this.historyPos = -1;
        this.historyCurrent = "";
    }

    textIn(text) {
        setBusy(true);
        if (text.length < 1) return;
        writeUserLine(text);
        forceScroll();
        $(".current-input").text("");
        var args = ArgStringSplit(text); //text.match(/\w+|"(?:\\"|[^"])+"/g);
        var app = args.shift();
        var cb = function() {
            forceScroll();
            setBusy(false);
        };
        if (Apps.hasOwnProperty(app)) {
            Apps[app].call(new AppArgs(args), cb);
        } else {
            writeLine(app + ": command not found");
            cb();
        }
        this.history.unshift(text);
        this.historyPos = -1;
        this.historyCurrent = "";
    }

    keyIn(key, text) {
        switch (key) {
            case "ArrowUp":
            case "ArrowDown":
                var d = key == "ArrowUp" ? 1 : -1;
                var hp = this.historyPos;
                var h = this.history;
                if (hp < 0) {
                    this.historyCurrent = $(".current-input").text();
                }
                var txt = "";
                hp += d;
                if (hp < 0) {
                    hp = -1;
                    txt = this.historyCurrent;
                } else {
                    if (hp >= h.length) {
                        hp = h.length - 1;
                    }
                    txt = h[hp];
                }

                $(".current-input").text(txt);
                this.historyPos = hp;
                break;
            case "Tab":
                var args = ArgStringSplit(text);
                if (args.length == 1) {
                    var apps = Object.keys(Apps);
                    apps = apps.filter(function(i) { return i.substring(0, args[0].length) == args[0]; });
                    if (apps.length == 1) {
                        $(".current-input").text(apps[0] + " ");
                    } else if (apps.length > 1) {
                        writeUserLine(text);
                        writeLine(apps.join("  "));
                    }
                } else {
                    var app = args.shift();
                    if (Apps.hasOwnProperty(app)) {
                        Apps[app].keyIn(key, text.substring(app.length).trim());
                    }
                }
                break;
            default:
                break;
        }
    }
}

class HistoryApp extends BaseApp {

    constructor(cmd) {
        super();
        this.cmd = cmd;
    }


    call(args, cb) {
        var l = 5;
        var resp = [];
        if (args.hasOwnProperty("n")) {
            l = args["n"];
        }
        if (l > this.cmd.history.length) {
            l = this.cmd.history.length;
        }
        for (var i = 1; i <= l; i++) {
            resp.push(this.cmd.history[l - i]);
            writeLine(this.cmd.history[l - i]);
        }
        cb();
        return resp;
    }
}