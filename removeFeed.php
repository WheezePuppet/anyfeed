<?php
    require "ensureLoggedIn.php";
    require_once "connectToDb.php";
    $username = $_SESSION["username"];
    $url = $_GET["url"];

    $q = mysql_query("select count(*) from feeds where " .
        "username='$username' and feedurl='$url'");
    $row = mysql_fetch_row($q);
    if ($row[0] != 1) {
        print "not subscribed?";
        die();
    }

    // (Eventually need to adjust feed numbers.)
    mysql_query("delete from feeds where " .
        "username='$username' and feedurl='$url'");
    print "unsubscribed";
?>
