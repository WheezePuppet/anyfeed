<?php
    header("Content-Type: text/json");

    // Input: a JSON array of guids.
    // Output: another JSON array of guids, a subset of the input, including
    //   only those that have not been read.

    $input = json_decode($HTTP_RAW_POST_DATA);

    $conn = mysql_connect("localhost","stephen","iloverae");
    mysql_select_db("ooc");


    echo json_encode($input);
    flush();
?>
