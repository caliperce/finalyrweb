const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function analyzeImage(imageUrl) {
    try {
        console.log('Analyzing image with OpenAI...', imageUrl);
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        { 
                            type: "text", 
                                text: 'You are an expert at license plate recognition. Extract ONLY the license plate number from this image. Return the result in this exact JSON format: {"license_plate": "<number>"} where <number> is the license plate number. If no license plate is visible or readable, return {"license_plate": null}. Do not include any other text, explanations, or formatting.' 
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageUrl
                            }
                        }
                    ]
                }
            ],
            max_tokens: 100,
            temperature: 0
        });

        console.log('OpenAI analysis complete');
        
        // Get the raw response content
        const content = response.choices[0].message.content.trim();
        
        // Remove any markdown formatting if present
        const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
        
        // Parse the JSON string into an object
        let analysisObject;
        try {
            analysisObject = JSON.parse(cleanedContent);
            console.log('Parsed analysis object:', analysisObject);
            
            // Ensure the object has the correct structure
            if (!analysisObject.hasOwnProperty('license_plate')) {
                console.warn('Analysis object missing license_plate property');
                analysisObject = { license_plate: null };
            }
        } catch (err) {
            console.error('Error parsing OpenAI response:', err);
            // Return a null license plate if parsing fails
            analysisObject = { license_plate: null };
        }
        
        // Return the parsed object directly
        return analysisObject;
    } catch (error) {
        console.error('Error in OpenAI analysis:', error);
        throw error;
    }
}

module.exports = {
    analyzeImage
}; 