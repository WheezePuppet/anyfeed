<?php
    header("Content-Type: text/xml");
    $url = $_GET['url'];

    /* Ian Finlayson is a genius */
    ini_set('user_agent','Mozilla/5.0');

    print file_get_contents($url);
    flush();
?>
