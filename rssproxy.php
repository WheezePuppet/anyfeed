<?php
    header("Content-Type: text/xml");
    $url = $_GET['url'];
    print file_get_contents($url);
    flush();
?>
