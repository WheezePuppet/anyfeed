<?php
    session_start();
    if (!isset($_SESSION["username"])) {
        print "error -- not logged in!";
        die();
    }
?>
