<?php

set_time_limit(0);
date_default_timezone_set('UTC');
require __DIR__.'/vendor/autoload.php';
/////// CONFIG ///////
$username = '';
$password = '';
$debug = true;
$truncatedDebug = false;
//////////////////////
$ig = new \InstagramAPI\Instagram($debug, $truncatedDebug);
try {
    $ig->login("enp_memes", "ks82jsh87");
    $ig->logout();
} catch (\Exception $e) {
    echo 'Something went wrong: '.$e->getMessage()."\n";
    exit(0);
}


?>