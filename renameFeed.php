<?php
    require_once "ensureLoggedIn.php";
    require_once "connectToDb.php";
    $username = $_SESSION["username"];
    $url = $_GET["url"];
    $title = $_GET["title"];

    mysql_query("update feeds set feedtitle='$title' " .
        "where username='$username' and feedurl='$url'");

    print "$title";
?>
