module.exports = {
    'development': {
        'MYSQL_USERNAME': 'phpmyadmin',
        'MYSQL_PASSWORD': 'phpmyadmin',
        'MYSQL_DATABASE': 'insta_sc',
    },
    'production': {
        'MYSQL_USERNAME': 'root',
        'MYSQL_PASSWORD': 'root',
        'MYSQL_DATABASE': 'insta_sc',
    },
    'JWT_SECRET': process.env.JWT_SECRET,
    'AES_SECRET': process.env.AES_SECRET,
    'AWS_AK_ID': process.env.AWS_ACCESS_KEY_ID,
    'AWS_SAK': process.env.AWS_SECRET_ACCESS_KEY,
    'AWS_REGION': 'us-east-1',
    'AWS_BUCKET': 'instasc'
}