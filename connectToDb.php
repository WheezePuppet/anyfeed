<?php
    $mysqlhost = getenv("MYSQL_HOST");
    $mysqldb = getenv("MYSQL_DB");
    $mysqluser = getenv("MYSQL_USER");
    $mysqlpass = getenv("MYSQL_PASS");

    $conn = mysql_connect($mysqlhost, $mysqluser, $mysqlpass);
    mysql_select_db($mysqldb);
?>
