<?php
    $username = $_COOKIE["anyfeedUsername"];
    $input = json_decode($HTTP_RAW_POST_DATA);
    $conn = mysql_connect("localhost","stephen","iloverae");
    mysql_select_db("anyfeed");

    $q = mysql_query("select max(num) from feeds where username='$username'");
    $newfeednum = 0;
    if ($row = mysql_fetch_row($q)) {
        $newfeednum = $row[0] + 1;
    }

    $title = mysql_real_escape_string($input->title);
    $url = mysql_real_escape_string($input->url);
    $link = mysql_real_escape_string($input->link);
    mysql_query("insert into feeds " .
        "(username, num, feedtitle, feedurl, feedlink) values " .
        "('$username',$newfeednum,'$title','$url','$link')");
?>
