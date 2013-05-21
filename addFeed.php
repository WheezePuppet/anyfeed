<?php
    $conn = mysql_connect("localhost","stephen","iloverae");
    mysql_select_db("ooc");

    $q = mysql_query("select max(num) from feeds where username='stephen'");
    $newfeednum = 0;
    if ($row = mysql_fetch_row($q)) {
        $newfeednum = $row[0] + 1;
    }

    $url = mysql_real_escape_string($_GET["url"]);
    $name = mysql_real_escape_string($_GET["name"]);
    mysql_query("insert into feeds values " .
        "('stephen',$newfeednum,'$name','$url')");
?>
