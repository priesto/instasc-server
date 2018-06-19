<?php

set_time_limit(0);
date_default_timezone_set('UTC');

require __DIR__.'/vendor/autoload.php';

use Aws\S3\S3Client;


// argv[0] == php/upload.php (script file)
// argv[1] == pid

if(count($argv) !== 2) {
    syslog(LOG_ERR, "Bad number of arguments passed");
    exit(1);
}


// Retrieve data from database

$servername = "localhost";
$username = "phpmyadmin";
$password = "phpmyadmin";
$database = "insta_sc";

$conn = new mysqli($servername, $username, $password, $database);

if ($conn->connect_error) {
    syslog(LOG_ERR, "Unable to connect to the database");
    die("Connection failed: " . $conn->connect_error);
}

$pid = $argv[1];
$sql = <<<EOT
    SELECT caption, mediaURL, ig_username, ig_password, proxy FROM (
        SELECT * FROM posts WHERE posts.pid = $pid
    ) AS t INNER JOIN accounts ON t.aid = accounts.aid
EOT;

$res = $conn->query($sql);
$row = $res->fetch_assoc();

if($res->num_rows === 0) {
    syslog(LOG_ERR, "Could not find any post with this id");
    exit(1);
}


$caption = $row["caption"];
$mediaURL = $row["mediaURL"];
$ig_username = $row["ig_username"];
$ig_password = $row["ig_password"];
$proxy = $row["proxy"];




// Download image file

$filename = basename($mediaURL);
$path = "/tmp/" . $filename;

file_put_contents($path, file_get_contents($mediaURL));


// Decrypt password

$ig_password = decrypt($ig_password);


// Upload to Instagram

$debug = false;
$truncatedDebug = false;
$final_url = "";

$ig = new \InstagramAPI\Instagram($debug, $truncatedDebug);

try {
    $ig->setProxy($proxy);
    $ig->login($ig_username, $ig_password);
} catch (\Exception $e) {
    syslog(LOG_ERR, "Unable to connect to Instagram: " . $e->getMessage());
    changeStatus($conn, $pid, "FAILED");
    exit(1);
}

try {
    // The most basic upload command, if you're sure that your photo file is
    // valid on Instagram (that it fits all requirements), is the following:
    // $ig->timeline->uploadPhoto($photoFilename, ['caption' => $captionText]);
    // However, if you want to guarantee that the file is valid (correct format,
    // width, height and aspect ratio), then you can run it through our
    // automatic photo processing class. It is pretty fast, and only does any
    // work when the input file is invalid, so you may want to always use it.
    // You have nothing to worry about, since the class uses temporary files if
    // the input needs processing, and it never overwrites your original file.
    //_
    // Also note that it has lots of options, so read its class documentation!
    $photo = new \InstagramAPI\Media\Photo\InstagramPhoto($path);
    $response = $ig->timeline->uploadPhoto($photo->getFile(), ['caption' => $caption]);

    $media = $response->getMedia();
    $image_versions2 = $media->getImageVersions2();
    $candidates_array = $image_versions2->getCandidates();

    $_url = $candidates_array[0]->getUrl();
    $final_url = explode("?", $_url)[0];

} catch (\Exception $e) {
    syslog(LOG_ERR, "Unable to upload your image to Instagram: " . $e->getMessage());
    changeStatus($conn, $pid, "FAILED");
    exit(1);
}


try {

    $bucket = "instasc";
    $keyname = $filename;

    $s3 = new S3Client([
        'version' => 'latest',
        'region'  => 'us-east-1'
    ]);

    // Delete an object from the bucket.
    $s3->deleteObject([
        'Bucket' => $bucket,
        'Key'    => $keyname
    ]);

    changeURL($conn, $pid, $final_url);
    changeStatus($conn, $pid, "COMPLETED");
    $conn->close();
    exit(0);

} catch(\Exception $e) {
    syslog(LOG_ERR, "Unable to delete s3 object: " . $e->getMessage());
    // Even though we were unable to delete the s3 object, it doesn't mean that
    // the upload was unsuccessfull. Thus `status` is still completed.
    // But we still quit with a non-zero exit code, to let the OS know that something went wrong.
    exit(1);
}



















function decrypt($cipher) {
    $cipherArray = explode(":", $cipher);
    
    $iv = hex2bin($cipherArray[0]);
    $encrypted = hex2bin($cipherArray[1]);
    $key = getenv("AES_SECRET");

    return openssl_decrypt($encrypted, "AES-256-CBC", $key, OPENSSL_RAW_DATA, $iv);
}


function changeStatus($conn, $pid, $status) {
    $sql = "UPDATE posts SET status = '$status' WHERE pid = $pid";
    
    if(!($conn->query($sql) === TRUE)) {
        syslog(LOG_ERR, "Unable to update post status to $status for pid: $pid, err: " . $conn->error);
        $conn->close();
        exit(1);
    }
}

function changeURL($conn, $pid, $url) {
    $sql = "UPDATE posts SET mediaURL = '$url' WHERE pid = $pid";
    var_dump($url);

    if(!($conn->query($sql) === TRUE)) {
        syslog(LOG_ERR, "Unable to update mediaURL for pid: $pid, err: " . $conn->error);
        $conn->close();
        exit(1);
    }
}

?>