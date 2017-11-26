var currentPath = "/";
var FileSystem = {};


function setPath(str) {
    currentPath = str;
    $(".current-path").text(currentPath);
}

class LSApp extends BaseApp{
	constructor(){
	}
	call(args){

	}
}