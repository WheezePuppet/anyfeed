<?php
    header("Content-Type: text/json");

    // Input: a JSON array of guids.
    // Output: another JSON array of guids, a subset of the input, including
    //   only those that have not been read.

    $input = json_decode($HTTP_RAW_POST_DATA);
    $output = array();

    $conn = mysql_connect("localhost","stephen","iloverae");
    mysql_select_db("ooc");

    for ($i=0; $i<count($input); $i++) {
        $guid = $input[$i];
        $q = mysql_query("select count(*) from posts " .
            "where username='stephen' and guid='$guid'");
        $row = mysql_fetch_row($q);
        if ($row[0] == 0) {
            array_push($output,$guid);
        }
    }

    echo json_encode($output);
    flush();
?>
