<?php
    require_once "ensureLoggedIn.php";
    require_once "connectToDb.php";

    $username = $_SESSION["username"];
    $guid = json_decode($HTTP_RAW_POST_DATA);
    $guid = mysql_real_escape_string(
        preg_replace('/[^(\x20-\x7F)]*/','', $guid));

    $q = mysql_query("select count(*) from posts where guid='$guid'");
    $row = mysql_fetch_row($q);
    if ($row[0] == 0) {
        mysql_query("insert into posts (username, guid) values " .
            "('$username','$guid')");
        print "read\n";
    } else {
        mysql_query("delete from posts where username='$username' and " .
            "guid='$guid'");
        print "unread\n";
    }

?>
