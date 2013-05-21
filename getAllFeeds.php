<?php
    header("Content-Type: text/xml");
    $conn = mysql_connect("localhost","stephen","iloverae");
    mysql_select_db("ooc");

    print "<feeds>";
    $q = mysql_query("select * from feeds where username='stephen'");
    while ($row = mysql_fetch_assoc($q)) {
        print "<feed>";
        print "<feedtitle>" . $row["feedtitle"] . "</feedtitle>";
        print "<feedurl>" . $row["feedurl"] . "</feedurl>";
        print "<feedlink>" . $row["feedlink"] . "</feedlink>";
        print "</feed>";
    }
    print "</feeds>";
    flush();
?>
