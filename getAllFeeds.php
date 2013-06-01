<?php
    header("Content-Type: text/xml");
    require_once "ensureLoggedIn.php";
    require_once "connectToDb.php";

    $username = $_SESSION["username"];

    print "<feeds>";
    $q = mysql_query("select * from feeds where username='$username'");
    while ($row = mysql_fetch_assoc($q)) {
        $feedtitle = str_replace('&','&amp;',$row["feedtitle"]);
        $feedurl = str_replace('&','&amp;',$row["feedurl"]);
        $feedlink = str_replace('&','&amp;',$row["feedlink"]);
        $num = $row["num"];
        print "<feed>";
        print "<feedtitle>$feedtitle</feedtitle>";
        print "<num>$num</num>";
        print "<feedurl>$feedurl</feedurl>";
        print "<feedlink>$feedlink</feedlink>";
        print "</feed>";
    }
    print "</feeds>";
    flush();
?>
