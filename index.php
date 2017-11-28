<?php
$time = time();
?><!DOCTYPE html>
<html>

    <head>
        <title></title>
        <link rel="stylesheet" type="text/css" href="css/main.css">
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
        <script src="js/apps.js?<?= $time ?>"></script>
        <script src="js/util.js?<?= $time ?>"></script>
        <script src="js/fs.js?<?= $time ?>"></script>
        <script src="js/user.js?<?= $time ?>"></script>
        <script src="js/main.js?<?= $time ?>"></script>
    </head>

    <body>
        <p id="main"><span id="display" class="display"></span><input id="input" type="text" tabindex="0" autofocus></p>
    </body>

</html>