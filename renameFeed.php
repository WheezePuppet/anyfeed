<?php
    require_once "ensureLoggedIn.php";
    $username = $_SESSION["username"];
    $url = $_GET["url"];
    $title = $_GET["title"];

    $conn = mysql_connect("localhost","stephen","iloverae");
    mysql_select_db("anyfeed");

    mysql_query("update feeds set feedtitle='$title' " .
        "where username='$username' and feedurl='$url'");

    print "$title";
?>
