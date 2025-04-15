const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = require('twilio')(accountSid, authToken);

/**
 * Sends a parking tariff message to a phone number
 * @param {string} phoneNumber - The phone number to send the message to
 * @param {string} duration - The parking duration
 * @param {number} fee - The parking fee
 * @param {string} [customMessage] - Optional custom message
 * @returns {Promise<boolean>} - Returns true if message was sent successfully
 */
async function sendParkingMessage(phoneNumber, duration, fee, customMessage = null) {
    try {
        console.log('📱 Attempting to send parking message:');
        console.log('   - Phone Number:', phoneNumber);
        console.log('   - Duration:', duration);
        console.log('   - Fee:', fee);
        console.log('   - Custom Message:', customMessage);

        // Format the message
        const messageBody = customMessage || 
            `The total time duration you've parked is: ${duration} and you've to pay an amount of $${fee.toFixed(2)}. Visit this link to pay the parking fee: https://finalyrwebproject.vercel.app`;

        // Send the message
        const message = await client.messages.create({
            body: messageBody,
            messagingServiceSid: messagingServiceSid,
            to: phoneNumber
        });

        console.log('✅ Message sent successfully:', message.sid);
        return true;
    } catch (error) {
        console.error('❌ Error sending message:', error);
        console.error('   - Error Code:', error.code);
        console.error('   - Error Message:', error.message);
        return false;
    }
}

// Export the function so it can be used by other files
module.exports = {
    sendParkingMessage
};