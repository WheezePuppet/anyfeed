<?php
    $guid = mysql_real_escape_string($_GET["guid"]);
    $guid = $_GET["guid"];

    $conn = mysql_connect("localhost","stephen","iloverae");
    mysql_select_db("anyfeed");

    $q = mysql_query("select count(*) from posts where guid='$guid'");
    $row = mysql_fetch_row($q);
    if ($row[0] == 0) {
        mysql_query("insert into posts (username, guid) values " .
            "('stephen','$guid')");
        print "read\n";
    } else {
        mysql_query("delete from posts where username='stephen' and " .
            "guid='$guid'");
        print "unread\n";
    }

?>
