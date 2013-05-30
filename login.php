<?php
    session_start();
    $username = $_GET["username"];
    $password = $_GET["password"];
    mysql_connect("localhost","stephen","iloverae");
    mysql_select_db("anyfeed");
    $q = mysql_query("select count(*) from users " .
        "where username='$username' and password='$password'");
    $row = mysql_fetch_row($q);
    if ($row[0] == 0) {
        print "nope";
    } else {
        $_SESSION["username"] = $username;
        print "logged in new";
    }
?>
