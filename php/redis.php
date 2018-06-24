<?php

set_time_limit(0);
date_default_timezone_set('UTC');

require __DIR__.'/vendor/autoload.php';

$options = array (
    'scheme' => 'tcp',
    'host' => '127.0.0.1',
    'port' => 6379,
    'database' => 0,
    'read_write_timeout' => 0
);

$debug = false;
$truncatedDebug = false;

$pub = new Predis\Client($options);
$sub = new Predis\Client($options);

$publisher = new \Superbalist\PubSub\Redis\RedisPubSubAdapter($pub);
$subscriber = new \Superbalist\PubSub\Redis\RedisPubSubAdapter($sub);

$ig = new \InstagramAPI\Instagram($debug, $truncatedDebug);

$subscriber->subscribe("request", function ($message) use($publisher, $ig) {

    // RedisPubSubAdapter automatically converts JSON into a PHP array.
    // No need to use json_decode.

    $username = $message['username'];
    $password = $message['password'];

    try {

        //TODO: What if a user want to use a proxy?

        $res = $ig->login($username, $password);

        if($res) {

            $decoded = json_decode($res);
            $user_id = $decoded->logged_in_user->pk;
            $profile_pic = $decoded->logged_in_user->profile_pic_url;
    
            $json = array(
                "id" => $user_id,
                "img" => $profile_pic,
                "new_session" => true
            );
    
            $publisher->publish("response", json_encode($json));

        }

        else {

            // A session already exists for this user, thus `$res` is null.
            // TODO: Figure out what to do in this case, for the moment we simply respond a 403 code.
    
            // TODO: Retrieve id and img_url
            // $ig->account->getCurrentUser(); // UserInfoResponse->getUser() // Model\User->getHdProfilePicUrlInfo
            // ImageCandidate->getUrl()

            $user_id = $ig->account_id;
            $profile_pic = $ig->account->getCurrentUser()->getUser()->getHdProfilePicUrlInfo()->getUrl(); 

            $json = array(
                "id" => $user_id,
                "img" => $profile_pic,
                "new_session" => false
            );

            $publisher->publish("response", json_encode($json));
            
        }

    } catch(Exception $e) {

        // An error occured during the login process.
        // Let's log everything and inform Node.js
        syslog(LOG_ERR, "Something went wrong: " . $e->getMessage() . "\n");

        $json = array(
            "err" => $e->getMessage()
        );

        if($e instanceof \InstagramAPI\Exception\IncorrectPasswordException)
            $json["code"] = 401;
        else
            $json["code"] = 500;


        $publisher->publish("response", json_encode($json));
        
    }

});


?>