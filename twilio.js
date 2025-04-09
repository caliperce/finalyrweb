require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

client.messages
    .create({
        body: 'Visit this link to pay your Parking Fee : http://127.0.0.1:5500/auth-webapp/dashboard.html',
        messagingServiceSid: 'MGc029310fcdd0b307b847cff287d9d3c5',
        to: '+919962973049'
    })
    .then(message => console.log(message.sid));