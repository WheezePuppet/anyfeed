<?php
    header("Content-Type: text/xml");
    $conn = mysql_connect("localhost","stephen","iloverae");
    mysql_select_db("ooc");

    print "<feeds>";
    $q = mysql_query("select * from feeds where username='stephen'");
    while ($row = mysql_fetch_assoc($q)) {
        print "<feed>";
        print "<feedname>" . $row["feedname"] . "</feedname>";
        print "<feedurl>" . $row["feedurl"] . "</feedurl>";
        print "</feed>";
    }
    print "</feeds>";
    flush();
?>
