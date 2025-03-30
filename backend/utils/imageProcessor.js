const { uploadToS3 } = require('./s3Handler');
const { analyzeImage } = require('./openaiHandler');

async function processImage(file, type) {
    try {
        // Upload to S3
        const timestamp = new Date().toISOString();
        const key = `${type}/${timestamp}-${file.originalname}`;
        console.log('Processing image...', { type, timestamp });
        
        // Upload to S3 first
        const imageUrl = await uploadToS3(file, key);
        console.log('Image uploaded successfully:', imageUrl);
        
        // Then analyze with OpenAI
        console.log('Starting OpenAI analysis...');
        const analysis = await analyzeImage(imageUrl);
        console.log('OpenAI analysis complete');

        return {
            success: true,
            type,
            imageUrl,
            analysis,
            timestamp
        };
    } catch (error) {
        console.error('Error in processImage:', error);
        throw error;
    }
}

module.exports = {
    processImage
}; 