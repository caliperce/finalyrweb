const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Initialize S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Upload file to S3
async function uploadToS3(file, key) {
    try {
        console.log('Uploading to S3...', {
            bucket: process.env.S3_BUCKET,
            key: key,
            contentType: file.mimetype
        });

        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
        });

        await s3Client.send(command);
        
        // Create a publicly accessible URL
        const publicUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        console.log('Public URL:', publicUrl);
        
        return publicUrl;
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw error;
    }
}

module.exports = {
    uploadToS3
}; 