class AppParams {
    constructor(args) {
        args = args.filter(function(e) { return e.trim() !== ""; });
        this.raw = args;
        this.switches = {};
        this.clean = [];
        for (let i = 0; i < args.length; i++) {
            let a = args[i];
            if (a.charAt(0) == "-" && a.length > 1) {
                a = a.substring(1);
                let a2 = "";
                if (i < args.length - 1) {
                    a2 = args[i + 1];
                }
                this.switches[a] = a2;
                i++;
            } else {
                this.clean.push(a);
            }
        }
    }
}


class BaseApp {
    constructor(caller) {
        BaseApp.id++;
        let _id = BaseApp.id;
        BaseApp.running[_id] = this;
        let _caller = caller;
        let _user = caller.getUserIdentity();
        this._callerInterface = new CallerInterface(this, caller.getCWD());
        this.getUserIdentity = function() { return _user; };
        this.getUser = function() { return _user; };
        this.getCaller = function() { return _caller; };
        this.getID = function() { return _id; };
        this.switches = {};
        this.options = {};
        this.help = {
            usage: "command [options]",
            description: "List information about the FILEs (the current directory by default).\nReturns the listing in alphabetical order"
        }
        this.setup();
        this.options.help = false;
        this.switchesToggled = [];
        this.switches["help"] = {
            desc: "show the help listing",
            alias: "?",
            option: "help",
            type: "bool",
        };
        this.switchAliases = {};
        let ks = Object.keys(this.switches);
        for (let i = 0; i < ks.length; i++) {
            let sw = this.switches[ks[i]];
            if (sw.alias.length == 1) {
                this.switchAliases[sw.alias] = ks[i];
            }
        }

    }

    run(args, _cb) {
        this.params = new AppParams(args);
        this.processParams();
        let app = this;
        let cb = function(output) {
            _cb(output);
            app.finish();
        }

        if (this.options.help) {
            this.helpText(cb);
        } else {
            this.main(cb);
        }
    }

    helpText(cb) {
        let text = "";
        text += this.help.usage + "\n\n" + this.help.description + "\n\n";
        let ks = Object.keys(this.switches);
        for (let i = 0; i < ks.length; i++) {
            let sw = this.switches[ks[i]];
            if (sw.alias.length == 1) {
                text += " -" + sw.alias + ",  ";
            } else {
                text += "      ";
            }
            text += "--" + padCutString(ks[i], 15);
            text += stringDivider(sw.desc, 50, "\n                       ");
            text += "\n";
        }
        cb(text);
    }

    finish() {
        delete BaseApp.running[this.getID()];
    }


    setup() {

    }

    setSwitch(set, val) {
        if (this.switchesToggled.indexOf(set) >= 0) return;
        this.switchesToggled.push(set);
        let opt = this.switches[set].option
        switch (this.switches[set].type) {
            case "bool":
                this.options[opt] = !this.options[opt];
                break;
            case "arg":
                this.options[opt] = val;
        }
    }

    processParams() {
        let switches_set = Object.keys(this.params.switches);
        let aliases = Object.keys(this.switchAliases);
        for (let i = 0; i < switches_set.length; i++) {
            let set = switches_set[i];
            let val = this.params.switches[set];
            let long = false;
            if (set.substring(0, 1) == "-") {
                long = true;
                set = set.substring(1);
            }
            if (!this.switches.hasOwnProperty(set)) {
                if (!long) {
                    let _set = null;
                    for (let j = 0; j < aliases.length; j++) {
                        let alias = aliases[j];
                        if (set.includes(alias)) {
                            this.setSwitch(this.switchAliases[alias], val);
                        }
                    }
                }
            } else {
                this.setSwitch(set, val);
            }
        }
    }

    main() {
        let args = this.params.raw.join('", "');
        if (args.length > 0) {
            args = '"' + args + '"';
        }
        cb("[" + this.constructor.name + "] run with: (" + args + ")");
    }
}

BaseApp.running = {};
BaseApp.id = 0;

class LSApp extends BaseApp {

    setup() {
        this.options = {
            showAll: false,
            details: false,
            showAlmostAll: false,
            colourless: false,
        }
        this.switches = {
            all: {
                desc: "show hidden files aswell",
                alias: "a",
                option: "showAll",
                type: "bool",
            },
            long: {
                desc: "show long list",
                alias: "l",
                option: "details",
                type: "bool",
            },
            "almost-all": {
                desc: "show all items excluding . and ..",
                alias: "A",
                option: "showAlmostAll",
                type: "bool",
            },
            colourless: {
                desc: "dont colour the output",
                alias: "c",
                option: "colourless",
                type: "bool",
            },
        };
    }

    main(cb) {
        let path = this.params.clean[0];
        if (typeof path !== "string") path = "";
        path = path.trim();
        let p = path;
        p = buildPath(p, this);
        console.log("LS PATH", p);
        let item = FS.getChildPath(this, p);
        let text = "";
        if (item !== null) {
            if (item.isDirectory()) {
                let is = item.getChildren(this);
                if (this.options.showAll) {
                    is.unshift("..");
                    is.unshift(".");
                } else if (!this.options.showAlmostAll) {
                    is = is.filter(function(i) { return i.substring(0, 1) != "." });
                }
                if (is.length > 0) {

                    let fnc = [];
                    for (let i = 0; i < is.length; i++) {
                        if (this.options.colourless) {
                            fnc.push(is[i]);
                        } else {
                            let it = null;
                            if (is[i] == "..") {
                                it = item.getParent();
                            } else if (is[i] == ".") {
                                it = item;
                            } else {
                                it = item.getChild(this, is[i]);
                            }
                            if (it != null) {
                                //TODO: BAD BAD BAD BAD BAD
                                fnc.push('<span style="color:#' + it.colorCode(this) + '">' + is[i] + "</span>");
                            }
                        }
                    }

                    if (this.options.details) {
                        text += "  PERMS   | COUNT | OWNER   | GROUP   | File\n";
                        for (let i = 0; i < is.length; i++) {
                            let it = null;
                            if (is[i] == "..") {
                                it = item.getParent();
                            } else if (is[i] == ".") {
                                it = item;
                            } else {
                                it = item.getChild(this, is[i]);
                            }
                            if (it != null) {
                                let p = it.getPerms();
                                text += it.getPermString(false) + " ";
                                text += padCutString("   " + (it.getChildCount(this,true) + 1),8);
                                text += padCutString(" " + it.getOwner(), 10);
                                text += padCutString(" " + it.getGroup(), 10);
                                text += ' ' + fnc[i] + '\n';
                            }
                        }
                    } else {
                        text = fnc;
                    }
                }
            } else {
                throw new Error("INVALID PATH");
            }
        }
        cb(text);
    }
}

class CatApp extends BaseApp {
    setup() {
        this.options = {
            count: 10,
            all: false
        }
        this.switches = {
            all: {
                desc: "return the entire file contents (overrides number)",
                alias: "a",
                option: "all",
                type: "bool",
            },
            number: {
                desc: "how many lines of the file to return",
                alias: "n",
                option: "count",
                type: "arg",
            },
        };
    }

    main(cb) {
        let path = this.params.clean[0];
        if (typeof path !== "string") path = "";
        let p = buildPath(path, this);
        let item = FS.getChildPath(USER, p);
        if (item !== null) {
            if (item.isFile()) {
                let content = item.getContent(this).toString();
                if (this.options.all) {
                    cb(content);
                } else {
                    content = content.split("\n");
                    cb(content.slice(0, parseInt(this.options.count)).join("\n"));
                }
                return;
            }
        }
        throw new Error("INVALID PATH");
    }
}

class TailApp extends BaseApp {
    setup() {
        this.options = {
            count: 10,
            all: false
        }
        this.switches = {
            all: {
                desc: "return the entire file contents (overrides number)",
                alias: "a",
                option: "all",
                type: "bool",
            },
            number: {
                desc: "how many lines of the file to return",
                alias: "n",
                option: "count",
                type: "arg",
            },
        };
    }

    main(cb) {
        let path = this.params.clean[0];
        this.options.count = parseInt(this.options.count);
        if (typeof path !== "string") path = "";
        let p = buildPath(path, this);
        let item = FS.getChildPath(USER, p);
        if (item !== null) {
            if (item.isFile()) {
                let content = item.getContent(this).toString();
                if (this.options.all) {
                    cb(content);
                } else {
                    content = content.split("\n");
                    cb(content.slice(content.length - this.options.count - 1, -1).join("\n"));
                }
                return;
            }
        }
        throw new Error("INVALID PATH");
    }
}

class CDApp extends BaseApp {
    main(cb) {
        let path = this.params.clean[0];
        if (typeof path !== "string") path = "";
        let p = buildPath(path, this);
        let item = FS.getChildPath(this, p);
        if (item !== null) {
            if (item.isDirectory()) {
                this.getCaller().setCWD(p);
                cb();
                return;
            }
        }
        throw new Error("INVALID PATH");
    }
}

class MVApp extends BaseApp {

}

class CPApp extends BaseApp {

}

class WaitApp extends BaseApp {
    setup() {
        this.options = {
            time: 10,
        }
        this.switches = {
            time: {
                desc: "how long to wait for",
                alias: "t",
                option: "time",
                type: "arg",
            },
        };
    }

    main(cb) {
        let tick = 10;
        if (this.params.clean.length < 1) {
            tick = this.options.time;
        } else {
            tick = parseInt(this.params.clean[0]);
        }

        let ticker = window.setInterval(function() {
            write(" .");
            console.log(tick);
            if (--tick <= 0) {
                window.clearInterval(ticker);
                write("\n");
                cb();
            }
        }, 1000)
    }
}

class WgetApp extends BaseApp {

    setup() {
        this.options = {
            save: false,
        }
        this.switches = {
            save: {
                desc: "prompt to download file after",
                alias: "s",
                option: "save",
                type: "bool",
            },
        };
    }

    main(cb) {
        let url = null;
        if (this.params.clean.length > 0) {
            url = this.params.clean[0];
        }
        if (url == null) {
            writeLine("Missing URL");
            cb();
        } else {
            writeLine("Fetching: " + url);
            writeLine("");
            $.ajax({
                url: url + "?" + Date.now(),
                success: function(data) {
                    cb(data);
                },
                error: function(e) {
                    cb(new Error("Http Error: " + e.toString()));
                }
            });
        }
    }
}

class HelpApp extends BaseApp {
    main(cb) {
        var app = getApp(this, "wget");
        this.runApp(app, ["help.txt"], function(data) {
            cb(data);
        });
    }
}

class PingApp extends BaseApp {
    setup() {
        this.options = {
            count: 5,
        }
        this.switches = {
            number: {
                desc: "how many lines of the file to return",
                alias: "n",
                option: "count",
                type: "arg",
            },
        };
    }

    main(cb) {
        let url = this.params.clean[0];
        if (typeof url !== "string") {
            cb();
        } else {
            let tick = this.options.count;
            let ticker = window.setInterval(function() {

                writeLine("PINGING: " + url);
                if (--tick <= 0) {
                    window.clearInterval(ticker);
                    cb();
                }

            }, 1000);
        }
    }
}

class TouchApp extends BaseApp {
    main(cb) {
        let path = this.params.clean[0];
        if (typeof path !== "string" || path.length < 1) {
            throw new Error("INVALID PATH");
        }
        path = buildPath(path, this);
        path = path.split("/");
        let fn = path.pop();
        path = path.join("/");

        var dir = FS.getChildPath(this, path);

        if (dir.isDirectory()) {
            dir.addFile(this, fn, null);
        }
        cb();
    }
}
class MKDIRApp extends BaseApp {
    main(cb) {
        let path = this.params.clean[0];
        if (typeof path !== "string" || path.length < 1) {
            throw new Error("INVALID PATH");
        }
        path = buildPath(path, this);
        path = path.split("/");
        let fn = path.pop();
        path = path.join("/");

        var dir = FS.getChildPath(this, path);

        if (dir.isDirectory()) {
            dir.addDir(this, fn);
        }
        cb();
    }
}
class SUDOApp extends BaseApp {

}
class SUApp extends BaseApp {

}
class CHMODApp extends BaseApp {
    setup() {
        this.options = {
            recursive: false,
            verbose: false,
            changes: false,
            silent: false,
            files: true,
            directories: true,
            match: false,
        }
        this.switches = {
            changes: {
                desc: "like verbose but show only changes",
                alias: "c",
                option: "changes",
                type: "bool",
            },
            silent: {
                desc: "suppress error messages",
                alias: "f",
                option: "silent",
                type: "bool",
            },
            verbose: {
                desc: "output for all files run against",
                alias: "v",
                option: "verbose",
                type: "bool",
            },
            recursive: {
                desc: "recurse down through directories",
                alias: "R",
                option: "recursive",
                type: "bool",
            },
            "only-files": {
                desc: "only modify files",
                alias: "F",
                option: "directories",
                type: "bool",
            },
            "only-dirs": {
                desc: "only modify directories",
                alias: "D",
                option: "files",
                type: "bool",
            },
            match: {
                desc: "only modify items that match this string (can use wildcards at start or end)",
                alias: "m",
                option: "match",
                type: "arg",
            }
        };
    }

    main(cb) {
        var read = [];
        let perms = "";
        let path = "";
        for (let i = 0; i < this.params.raw.length && read.length < 2; i++) {
            let p = this.params.raw[i];
            if (p.substring(0, 1) !== "-") {
                read.push(p);
            }
        }

        let numReg = new RegExp('^[0-7]+$');

        if (read.length == 2) {
            let p1 = (read[0].length == 3 && numReg.test(read[0]));
            let p2 = (read[1].length == 3 && numReg.test(read[1]));

            if (p1 && p2) {
                let p = buildPath(read[0], this).split("/");
                p.pop();
                let dir = FS.getChildPath(this, p.join("/"));

                if (dir.isDirectory()) {
                    //writeLine([dir.getChildren(this).indexOf(read[0]) >= 0,read[0]]);
                    p1 = !(dir.getChildren(this).indexOf(read[0]) >= 0);
                }

            } else if (!p1 && !p2) {
                throw new Error("Invalid Parameters");
            }

            perms = p1 ? read[0] : read[1];
            path = p1 ? read[1] : read[0];

            path = buildPath(path, this).split("/");
            let fn = path.pop();
            path = path.join("/");

            let dir = FS.getChildPath(this, path);

            if (dir.isDirectory()) {
                this.setPerms(dir, fn, perms);
                cb();
                return;
            }
        }

        throw new Error("Invalid Parameters");
    }

    setPerms(dir, name, perms, all) {
        if (all !== true) all = false;
        let kids = dir.getChildren(this);
        for (let i = 0; i < kids.length; i++) {
            let n = kids[i];
            //writeLine(n + "    ==    " + name);
            if ((all || wildMatch(n,name)) && (this.options.match === false || wildMatch(n,this.options.match))) {
                let item = dir.getChild(this, n);
                if (item.isFile() && this.options.files) {
                    try {
                        let c = item.setPerms(this, perms);
                        if (c && this.options.changes || this.options.verbose) {
                            writeLine((c ? "Modified" : "Skipped ") + " : " + item.getPath());
                        }
                    } catch (e) {
                        if (!this.options.silent) {
                            writeLine("Failed to modify: " + item.getPath());
                        }
                    }
                } else if (item.isDirectory() && this.options.directories) {
                    if(this.options.recursive){
                        this.setPerms(item,"",perms,true);
                    }
                    try {
                        let c = item.setPerms(this, perms);
                        if (c && this.options.changes || this.options.verbose) {
                            writeLine((c ? "Modified" : "Skipped ") + " : " + item.getPath());
                        }
                    } catch (e) {
                        if (!this.options.silent) {
                            writeLine("Failed to modify: " + item.getPath());
                        }
                    }
                }
            }
        }

    }
}

class RECApp extends BaseApp {
    main(cb){
        let path = this.params.clean[0];
        if (typeof path !== "string") {
            path = "";
        }
        path = buildPath(path, this);
        let dir = FS.getChildPath(this,path);
        if(dir.isDirectory()){
            let items = dir.recursiveChildren(this);
            for(let i = 0; i < items.length;i++){
                writeLine(items[i].getPath());
            }
        }
        cb();
    }
}

class CHOWNApp extends BaseApp {

}

class RMApp extends BaseApp {
    
}