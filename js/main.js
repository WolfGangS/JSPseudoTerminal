var USER = null;
var GROUPS = ["guest"];
var domain = "localhost"
var workingDir = "user/guest";
var BUSY = false;
var BOOT = false;

var PATH = "bin";
var USERPATH = "";

var cmdHistory = [];
var cmdHistoryPos = -1;
var cmdHistoryCurrent = "";

var GlobalApps = {
    ls: LSApp,
    cat: CatApp,
    tail: TailApp,
    cd: CDApp,
    wait: WaitApp,
    help: HelpApp,
    wget: WgetApp,
    touch: TouchApp,
    chmod: CHMODApp,
    chown: CHOWNApp,
    sudo: SUDOApp,
    su: SUApp,
    mkdir: MKDIRApp,
    ping: PingApp,
    mv: MVApp,
    cp: CPApp,
    rm: RMApp,
    rec: RECApp,
};

function getAppList(caller) {
    caller = caller.getUserIdentity();

    var path = PATH + ";" + caller.getPath();

    var paths = path.split(";");
    var apps = {};
    for (var i = 0; i < paths.length; i++) {
        var p = paths[i];
        var dir = null;
        try {
            dir = FS.getChildPath(caller, p);
        } catch (e) {

        }
        if (dir !== null) {
            if (dir.isDirectory()) {
                var fs = dir.getChildren(caller, "file");
                for (var j = 0; j < fs.length; j++) {
                    var app = fs[j];
                    var f = dir.getChild(caller, app);
                    var c = f.getContent(caller);
                    if (typeof c == "function") {
                        apps[app] = {
                            path: p + "/" + app,
                            exec: c
                        };
                    }
                }
            }
        }
    }
    return apps;
}

function getAppNames(caller) {
    return Object.keys(getAppList(caller));
}

function getApp(caller, name) {
    var apps = getAppList(caller);
    if (apps.hasOwnProperty(name)) {
        return apps[name].exec;
    }
    return null;
}

function runCommand(text, cb) {
    var input = ArgStringSplit(text);
    var cmd = input.shift();
    let app = getApp(USER, cmd);
    if (app !== null) {
        USER.runApp(app, input, cb);
    } else {
        cb(new Error(cmd + ": command not found"));
    }
}

function keyInput(e) {
    if (BUSY || !BOOT) return false;
    //console.log(e.key);
    var text = $("input#input").val().trim();
    var input = ArgStringSplit(text);
    var cmd = input.shift();
    switch (e.key) {
        case "Enter":
            if (cmd.length > 0) {
                writeLine(text);
                cmdHistory.unshift(text);
                cmdHistoryPos = -1;
                $("input#input").val('');
                BUSY = true;
                cmdHistoryCurrent = "";
                runCommand(text, function(output) {
                    if (typeof output !== "undefined") {
                        if (typeof output !== "string" || output.length > 0) {
                            if (output.constructor == Array) {
                                output = output.join("  ");
                            }
                            writeLine(output);
                        }
                    }
                    BUSY = false;
                    window.setTimeout(prompt, 100);
                });
            }
            return false;
            break;
        case "Tab":
            if (cmd.length > 0) {
                var echo = null;
                if (input.length > 0) {
                    let st = $("input#input")[0].selectionStart;
                    let en = $("input#input")[0].selectionEnd;
                    if (en > cmd.length) {
                        en -= cmd.length + 1;
                        let l = 0;
                        let i = 0;
                        for (i = 0; i < input.length; i++) {
                            l += input[i].length;
                            if (input[i].includes(" ")) {
                                l += 2;
                            }
                            if (en <= l) {
                                break;
                            }
                            l++;
                        }


                        let inp = input[i];
                        let slash = inp.substring(0, 1) == "/";
                        inp = inp.split("/");
                        //console.log(inp);
                        let cur = inp.pop();
                        //console.log(inp);
                        inp = (slash ? "/" : "") + inp.join("/");
                        USER.runApp(getApp(USER, "ls"), [inp, "-Ac"], function(output) {
                            console.log(output);
                            if (output.constructor === Array) {
                                output = output.filter(function(e) { return e.substring(0, cur.length) == cur; });
                                if (output.length > 0) {
                                    if (output.length == 1) {
                                        if (inp.length > 0 && inp != "/") {
                                            inp += "/";
                                        }
                                        inp += output[0];
                                        input[i] = inp;
                                        for (i = 0; i < input.length; i++) {
                                            if (input[i].includes(" ")) {
                                                input[i] = '"' + input[i] + '"';
                                            }
                                        }
                                        $("input#input").val(cmd + " " + input.join(" "));
                                        console.log(inp);
                                    } else {
                                        writeLine(text);
                                        writeLine(output.join("  "));
                                        prompt();
                                    }
                                }
                            }
                        });
                    }

                    //console.log(st, en, text.length, input);
                } else {
                    var apps = getAppNames(USER).filter(function(i) {
                        return i.substring(0, cmd.length) == cmd;
                    });
                    if (apps.length == 1) {
                        $("input#input").val(apps[0] + " ");
                    } else if (apps.length > 1) {
                        echo = apps.join("  ");
                    }
                }
                if (typeof echo == "string") {
                    writeLine(text);
                    writeLine(echo);
                    prompt();
                }
            }
            return false;
            break;
        case "ArrowUp":
        case "ArrowDown":
            if (cmdHistoryPos < 0) {
                cmdHistoryCurrent = text;
            }
            cmdHistoryPos += e.key == "ArrowUp" ? 1 : -1;
            if (cmdHistoryPos >= cmdHistory.length) {
                cmdHistoryPos = cmdHistory.length - 1;
            }
            if (cmdHistoryPos < 0) {
                cmdHistoryPos = -1;
                $("input#input").val(cmdHistoryCurrent);
            } else {

                $("input#input").val(cmdHistory[cmdHistoryPos]);
            }
            console.log(cmdHistoryPos);
            return false;
            break;
        default:
            return true;
            break;
    }
}

function prompt() {
    write(USER.getName() + "@" + domain, "#0f0");
    write(":");
    var t = "user/" + USER.getName();
    var p = USER.getCWD();
    if (p.substring(0, t.length) == t) {
        p = "~" + p.substring(t.length);
    } else {
        p = "/" + p;
    }
    write(p, "#00f");
    write("$ ");
    calcInputWidth();
    forceScroll();
    BUSY = false;
}

function calcInputWidth() {
    var l = $(".display").children().last();
    var w = l.offset().left + l.width();
    $("input#input").css("width", $("#main").width() - w - 1);
}

function writeSlowLine(text, col, cb) {
    if (text.charAt(-1) !== "\n") {
        text += "\n";
    }
    writeSlow(text, col, cb);
}

function writeSlow(text, col, cb) {
    var i = 0;
    var sp = $("<span>");
    if (typeof col == "string") {
        sp.css("color", col);
    } else if (typeof col == "function") {
        cb = col;
    }
    sp.appendTo(".display");
    var tm = window.setInterval(function() {
        sp.html(text.substring(0, ++i));
        if (i >= text.length) {
            window.clearInterval(tm);
            cb();
        }
    }, 5);
}

function write(txt, col, prefix, suffix) {
    let t = typeof txt;
    if (t !== "string") {
        console.log(t,txt);
        switch (t) {
            case "object":
                t = t.constructor.name;
                console.log(t);
                switch (t) {
                    case "Error":

                        break;
                }
                txt = txt.toString();
                break;
            default:
                txt = txt.toString();
                break;
        }
    }
    if (typeof prefix !== "string") {
        prefix = "";
    }
    if (typeof suffix !== "string" || (suffix == "\n" && txt.charAt(-1) == "\n")) {
        suffix = "";
    }
    var sp = $("<span>").html(prefix + txt + suffix);
    if (typeof col == "string") {
        sp.css("color", col);
    }
    sp.appendTo(".display");
}

function writeLine(text) {
    write(text, null, "", "\n");
}

function forceScroll() {
    var offset = $("input#input").offset().top - $(window).scrollTop();
    $('html,body').animate({scrollTop: offset}, 0);
}

$(document).ready(function() {
    $("input#input").on("keyup", keyInput);
    $("input#input").on("keydown keypress", function(e) {
        if (BUSY || !BOOT) return false;
        if (e.key == "Tab") return false;
    });

    $("body").on("mousedown", function(e) {
        if (e.target.id == "input" || $(e.target).closest('#display').length) {
            return true;
        }
        $("input#input").focus();
        return false;
    });
    $(window).resize(calcInputWidth);

    let boot = function(motd) {
        USER = new User("root");
        domain = window.location.hostname;
        if (domain.length < 1) domain = "localhost";
        if (typeof motd !== "string") motd = 'Welcome to WLF IO v0.1.2 LTNS (Little To No Support) (JQuery JS 3.2.1)\n\n * Try the command help to see what you can do\n';
        writeSlowLine(motd, function() {
            var c = getCookie("lastLogin");
            if (c == null) {
                writeLine("Welcome new user!");
            } else {
                writeLine("Last Login: " + c);
            }
            setCookie("lastLogin", new Date().toUTCString(), 365);
            prompt();
        });
        FS = new FSDir(USER);
        var uDir = FS.addDir(USER, "user");
        var gDir = uDir.addDir(USER, "guest").setOwner(USER, "guest").setGroup(USER, "guest");
        var aDir = uDir.addDir(USER, "admin").setOwner(USER, "admin").setGroup(USER, "admin");

        aDir.addFile(USER, "test.txt", "This is some test text").setOwner(USER, "admin").setGroup(USER, "admin");

        var bDir = FS.addDir(USER, "bin");

        var ks = Object.keys(GlobalApps);

        for (var i = 0; i < ks.length; i++) {
            bDir.addFile(USER, ks[i], GlobalApps[ks[i]]).setPerms(USER, "745");
        }

        USER = new User("guest");
        $.ajax({
            url: "lorem.txt",
            async: false,
            success: function(data) {
                gDir.addFile(USER, "lorem.txt", data);
            }
        });
        gDir.addDir(USER, ".bin");
        gDir.addDir(USER, "test dir").addDir(USER, "test");
        BOOT = true;
    }

    $.ajax({
        url: "motd.txt?" + Date.now(),
        success: boot,
        error: boot,
    });
});