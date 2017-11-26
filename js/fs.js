var FS;

class FSItem {
    constructor(caller, parent, type, name) {
        caller = caller.getUserIdentity();
        if (!(parent instanceof FSDir)) {
            if (caller.getName() === "root") {
                parent = null;
            } else {
                throw new Error("INVALID PARENT");
                return;
            }
        }
        let _name = '';
        if (typeof name !== "string" || name.length < 1) {
            if (caller.getName() !== "root") {
                throw new Error("INVALID NAME");
                return;
            }
        } else {
            _name = name;
        }
        this.getName = function() {
            return _name;
        }

        let _type = type;
        this.getType = function() { return _type; };
        let _parent = parent;
        this.getParent = function() { return parent; };

        this.getPath = function() {
            let p = "";
            if (_parent !== null) {
                p = _parent.getPath() + "/";
            }
            return p + _name;
        }

        this.isFile = function() {
            return _type === "file";
        }

        this.isDirectory = function() {
            return _type === "directory";
        }
        let _perms = null;
        if (this.isDirectory()) {
            _perms = {
                owner: 7,
                group: 5,
                other: 5,
            };
        } else {
            _perms = {
                owner: 6,
                group: 4,
                other: 4,
            };
        }
        this.getPerms = function() {
            return {
                owner: _perms.owner,
                group: _perms.group,
                other: _perms.other,
            };
        }
        this.setPerms = function(caller, perm) {
            caller = caller.getUserIdentity();
            if (caller.getName() == "root" || caller.getName() == _owner) {
                if (typeof perm == "string" && perm.length == 3) {
                    let o = parseInt(perm.charAt(0));
                    let g = parseInt(perm.charAt(1));
                    let u = parseInt(perm.charAt(2));
                    if (o > 7) o = 7;
                    if (g > 7) g = 7;
                    if (u > 7) u = 7;
                    _perms.owner = o;
                    _perms.group = g;
                    _perms.other = u;
                }
            } else {
                throw new Error("PERMISSION VIOLATION");
                return;
            }
        }
        let _owner = caller.getName();
        let _group = _owner;

        this.setOwner = function(caller, owner) {
            caller = caller.getUserIdentity();
            if (caller.getName() !== "root") {
                throw new Error("PERMISSION VIOLATION");
                return;
            }
            _owner = owner;
            return this;
        };
        this.getOwner = function() { return _owner; }

        this.setGroup = function(caller, group) {
            caller = caller.getUserIdentity();
            if (caller.getName() == "root" || (caller.getName() == _owner && GROUPS.indexOf(group) >= 0)) {
                _group = group;
                return this;
            }
            throw new Error("PERMISSION VIOLATION");
            return;
        };
        this.getGroup = function() { return _group; }

        this.checkPerms = function(perm, caller) {
            caller = caller.getUserIdentity();
            let user = caller.getName();
            let groups = caller.getGroups();
            if (typeof groups == "undefined" || groups.constructor !== Array) groups = [];
            if (user == "root") return true;
            if (_perms.other & perm) return true;
            if (user == _owner && _perms.owner & perm) return true;
            if (groups.indexOf(_group) >= 0 && _perms.group & perm) return true;
            return false;
        }

        this.parentRecursivePerms = function(caller, perm) {
            caller = caller.getUserIdentity();
            if (this.checkPerms(perm, caller)) {
                if (_parent !== null) {
                    return _parent.parentRecursivePerms(caller, perm);
                }
                return true;
            }
            return false;
        }

    }

    canRead(caller) {
        return this.checkPerms(4, caller);
    }

    canWrite(caller) {
        return this.checkPerms(2, caller);
    }

    canExec(caller) {
        return this.checkPerms(1, caller);
    }

    colorCode(caller) {
        if (this.isDirectory()) return "00f";
        if (this.canExec(caller) && typeof this.getContent(caller) == "function") return "0f0";
        return "fff";
    }

}

class FSFile extends FSItem {
    constructor(caller, parent, name, content) {
        super(caller, parent, "file", name);
        let _content = content;
        this.getContent = function(caller) {
            if (this.canRead(caller)) {
                if (typeof _content != "function" || this.canExec(caller)) {
                    return _content;
                }
            }
            return null;
        }
    }
}

class FSDir extends FSItem {
    constructor(caller, parent, name) {
        super(caller, parent, "directory", name);
        let _children = {};
        this.addDir = function(caller, name) {
            if (!this.canExec(caller)) {
                throw new Error("PERMISSION VIOLATION");
                return;
            }
            if (_children.hasOwnProperty(name)) {
                throw new Error("DIRECTORY ALREADY EXISTS");
                return;
            }
            _children[name] = new FSDir(caller, this, name);
            return _children[name];
        };

        this.canAccess = function(caller) {
            return this.parentRecursivePerms(caller, 1);
        };

        this.addFile = function(caller, name, content) {
            if (!this.canAccess(caller) && this.canWrite(caller)) {
                throw new Error("PERMISSION VIOLATION");
                return;
            }
            if (_children.hasOwnProperty(name)) {
                throw new Error("FILE ALREADY EXISTS");
                return;
            }
            _children[name] = new FSFile(caller, this, name, content);
            return _children[name];
        };

        this.remItem = function(caller, name) {
            if (this.canAccess(caller) && this.canWrite(caller)) {
                if (_children.hasOwnProperty(name)) {
                    delete _children[name];
                }
            }
        };

        this.getChildPath = function(caller, path) {
            //writeLine(path);
            path = path.trim().split("/");
            let item = this;
            for (let i = 0; i < path.length && item != null; i++) {
                if (path[i].length > 0 && path[i] != ".") {
                    //writeLine(path[i]);
                    item = item.getChild(caller, path[i]);
                }
            }
            if (item == null) {
                throw new Error("INVALID PATH");
            } else {
                if (((item.isDirectory() && item.canAccess(caller)) || item.isFile()) && item.canRead(caller)) {
                    return item;
                }
                throw new Error("PERMISSION VIOLATION");
                return null;
            }
        };

        this.getChild = function(caller, name) {
            if (_children.hasOwnProperty(name)) {
                return _children[name];
            }
            return null;
        };

        /**
         * Gets a list of the itsm in this directory.
         * @param  {String} url
         * @return {Promise} promise that resolves to an image element or
         *                   fails to an Error.
         */
        this.getChildren = function(caller, type) {
            if (this.canAccess(caller) && this.canRead(caller)) {
                let ks = Object.keys(_children);
                ks.sort();
                if (typeof type !== "undefined") {
                    let _ks = [];
                    for (let i = 0; i < ks.length; i++) {
                        if (_children[ks[i]].getType() == type) {
                            _ks.push(ks[i]);
                        }
                    }
                    return _ks;
                } else {
                    return ks;
                }

            }
        };
    }
}