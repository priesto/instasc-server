<?php

set_time_limit(0);
date_default_timezone_set('UTC');

require __DIR__.'/vendor/autoload.php';

if(count($argv) !== 3) exit(1);

$username = $argv[1];
$password = $argv[2];
$debug = false;
$truncatedDebug = false;

$ig = new \InstagramAPI\Instagram($debug, $truncatedDebug);

try {
    $res = $ig->login($username, $password);
    if($res) {
        $decoded = json_decode($res);
        $user_id = $decoded->logged_in_user->pk;
        $profile_pic = $decoded->logged_in_user->profile_pic_url;

        $json = array(
            "id" => $user_id,
            "img" => $profile_pic
        );

        echo json_encode($json);
    }

    // A session already exists for this user, thus `$res` is null.
    // TODO: Figure out what to do in this case, for the moment we simply exit the process to let Node.js know
    //       that an error occured.

    syslog(LOG_WARNING, "Session already exists");
    exit(1);

} catch (\Exception $e) {
    syslog(LOG_ERR, "Something went wrong: " . $e->getMessage() . "\n");
    exit(1);
}

?>
