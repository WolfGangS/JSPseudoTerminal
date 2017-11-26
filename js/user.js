class User {
    constructor(name) {
        var _name = name;
        this._callerInterface = new CallerInterface(this, "user/" + _name);
        var _groups = [];
        var _path = this.getCWD() + "/.bin";
        this.getName = function() { return _name; };
        this.getGroups = function() { return _groups; };
        this.getPath = function() { return _path; };
        this.getUserIdentity = function() { return this; };
        this.getUser = function() { return this; };
    }
}


class CallerInterface {
    constructor(caller, cwd) {
        var _cwd = cwd;
        caller.getCWD = function() { return _cwd; };
        caller.setCWD = function(str) { _cwd = str; };
        caller.runApp = function(app, input, _cb) {
            try {
                app = new app(caller.getUserIdentity());
                let done = 0;
                var cb = function(output) {
                    if (done > 0) {
                        console.log("[" + app.constructor.name + "] CallBack(" + done + "): ", output);
                        return;
                    }
                    done++;
                    _cb(output);

                };
                app.run(input, cb);
            } catch (e) {
                console.log(e);
                _cb(e);
            }
        }
    }
}