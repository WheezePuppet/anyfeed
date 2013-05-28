<?php
    header("Content-Type: text/xml");
    $conn = mysql_connect("localhost","stephen","iloverae");
    mysql_select_db("anyfeed");

    print "<feeds>";
    $q = mysql_query("select * from feeds where username='stephen'");
    while ($row = mysql_fetch_assoc($q)) {
        $feedtitle = str_replace('&','&amp;',$row["feedtitle"]);
        $feedurl = str_replace('&','&amp;',$row["feedurl"]);
        $feedlink = str_replace('&','&amp;',$row["feedlink"]);
        print "<feed>";
        print "<feedtitle>$feedtitle</feedtitle>";
        print "<feedurl>$feedurl</feedurl>";
        print "<feedlink>$feedlink</feedlink>";
        print "</feed>";
    }
    print "</feeds>";
    flush();
?>
