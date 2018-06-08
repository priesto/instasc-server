module.exports = {
    'dev': {
        'MYSQL_USERNAME': 'phpmyadmin',
        'MYSQL_PASSWORD': 'phpmyadmin',
        'MYSQL_DATABASE': 'insta_sc',
        'JWT_SECRET': process.env.JWT_SECRET,
        'AES_SECRET': process.env.AES_SECRET,
        'AWS_AK_ID': process.env.AWS_AK_ID,
        'AWS_SAK': process.env.AWS_SAK,
        'AWS_REGION': 'us-east-1',
        'AWS_BUCKET': 'instasc' 
    },
    'prod': {
        'MYSQL_USERNAME': 'root',
        'MYSQL_PASSWORD': 'root',
        'MYSQL_DATABASE': 'insta_sc',
        'JWT_SECRET': process.env.JWT_SECRET,
        'AES_SECRET': process.env.AES_SECRET,
        'AWS_AK_ID': process.env.AWS_AK_ID,
        'AWS_SAK': process.env.AWS_SAK,
        'AWS_REGION': 'us-east-1',
        'AWS_BUCKET': 'instasc'
    }
}