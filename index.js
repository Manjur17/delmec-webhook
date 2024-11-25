const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Temporary in-memory store for user context
const userContext = {};

// WhatsApp Webhook Verification
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = "your-verify-token";
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WEBHOOK VERIFIED');
        res.status(200).send(challenge);
    } else {
        res.status(403).send('Forbidden');
    }
});

// WhatsApp Message Handler
app.post('/webhook', (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        const messageData = body.entry[0].changes[0].value.messages[0];
        const userId = messageData.from;
        const userMessage = messageData.text.body;

        // Initialize user context if not already present
        if (!userContext[userId]) {
            userContext[userId] = { state: null, name: null, address: null };
        }

        // Determine response based on user state and input
        let reply;

        switch (userContext[userId].state) {
            case null:
                if (userMessage.toLowerCase() === 'hi') {
                    reply = `Welcome! Please select an option:\n1. Add your name\n2. Add your address\n3. Get a greeting`;
                    userContext[userId].state = 'menu';
                } else {
                    reply = "Say 'Hi' to get started.";
                }
                break;

            case 'menu':
                if (userMessage === '1') {
                    reply = 'Please enter your name:';
                    userContext[userId].state = 'awaiting_name';
                } else if (userMessage === '2') {
                    reply = 'Please enter your address:';
                    userContext[userId].state = 'awaiting_address';
                } else if (userMessage === '3') {
                    if (userContext[userId].name) {
                        reply = `Hi ${userContext[userId].name}!`;
                    } else {
                        reply = `Hi! It seems we don't have your name yet. Please select "1" to add your name.`;
                    }
                    userContext[userId].state = 'menu';
                } else {
                    reply = `Invalid option. Please select:\n1. Add your name\n2. Add your address\n3. Get a greeting`;
                }
                break;

            case 'awaiting_name':
                userContext[userId].name = userMessage;
                reply = `Thanks, ${userMessage}! You can now select an option:\n1. Add your name\n2. Add your address\n3. Get a greeting`;
                userContext[userId].state = 'menu';
                break;

            case 'awaiting_address':
                userContext[userId].address = userMessage;
                reply = `Thanks for providing your address! You can now select an option:\n1. Add your name\n2. Add your address\n3. Get a greeting`;
                userContext[userId].state = 'menu';
                break;

            default:
                reply = "Something went wrong. Say 'Hi' to restart.";
                userContext[userId].state = null;
                break;
        }

        // Simulate sending the reply (replace this with WhatsApp API call)
        console.log(`Reply to ${userId}: ${reply}`);

        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
