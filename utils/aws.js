const aws = require('aws-sdk');
const crypto = require('crypto');
const mediaUtils = require('./media');

const {
    AWS_AK_ID,
    AWS_SAK,
    AWS_REGION,
    AWS_BUCKET
} = require('../config');

aws.config.update({
    accessKeyId: AWS_AK_ID,
    secretAccessKey: AWS_SAK,
    region: AWS_REGION
})

const s3 = new aws.S3();


const put = (filebuffer, cb) => {

    let content_type;
    let filename;
    let ext;

    mediaUtils.isJPEG(filebuffer.toString('hex', 0, 3)) ? content_type = 'image/jpeg' : null;
    mediaUtils.isGIF(filebuffer.toString('hex', 0, 4)) ? content_type = 'image/gif' : null;
    mediaUtils.isPNG(filebuffer.toString('hex', 0, 4)) ? content_type = 'image/png' : null;

    if(!content_type) cb(new Error('Unsupported file type'));

    ext = content_type.split('/')[1];
    filename = crypto.randomBytes(10).toString('hex') + '_' + Date.now() + '.' + ext;
    
    s3.putObject({
        ACL: 'public-read',
        Bucket: AWS_BUCKET,
        Key: filename,
        Body: filebuffer,
        CacheControl: 'max-age=31536000', // 1 year
        ContentType: content_type
    }, (err, data) => {
        if(err) cb(err)
        else {
            // console.log(data);
            // Returns an object containing an ETag key.
            const url = 'https://s3.amazonaws.com/instasc/' + filename;
            cb(null, url);
        }
    })
}

const deleteObject = (key, cb) => {
    s3.deleteObject({
        Bucket: AWS_BUCKET,
        Key: key
    }, (err, data) => {
        if(err) cb(err);
        else cb(null, data);
    })
}

module.exports = {
    put, deleteObject
}