<?php
    require "ensureLoggedIn.php";
    if ($_SESSION["username"] == $_GET["username"]) {
        unset($_SESSION["username"]);
        print "logged out";
    } else {
        print "not logged in!";
    }
?>
