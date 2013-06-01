<?php
    header("Content-Type: text/json");
    require_once "ensureLoggedIn.php";
    require_once "connectToDb.php";
    $username = $_SESSION["username"];

    // Input: a JSON array of guids.
    // Output: another JSON array of guids, a subset of the input, including
    //   only those that have not been read.

    $input = json_decode($HTTP_RAW_POST_DATA);
    $output = array();

    for ($i=0; $i<count($input); $i++) {
        $guid = $input[$i];
        $q = mysql_query("select count(*) from posts " .
            "where username='$username' and guid='" .
            mysql_real_escape_string(
                preg_replace('/[^(\x20-\x7F)]*/','', $guid)) . "'");
        $row = mysql_fetch_row($q);
        if ($row[0] == 0) {
            array_push($output,$guid);
        }
    }

    echo json_encode($output);
    flush();
?>
