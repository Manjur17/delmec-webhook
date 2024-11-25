const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express().use(bodyParser.json());

const token = process.env.TOKEN;
const mytoken = process.env.MYTOKEN; // Verification token for webhook
const userContext = {}; // Store user context in memory for now

// Start the server
app.listen(process.env.PORT, () => {
  console.log("Webhook is listening on port", process.env.PORT);
});

// Webhook verification for WhatsApp Cloud API
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];
  const token = req.query["hub.verify_token"];

  if (mode && token) {
    if (mode === "subscribe" && token === mytoken) {
      console.log("Webhook verified successfully.");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// Handle incoming WhatsApp messages
app.post("/webhook", async (req, res) => {
  const bodyParam = req.body;

  // Log the incoming request for debugging
  console.log("Incoming request:", JSON.stringify(bodyParam, null, 2));

  if (bodyParam.object) {
    const changes = bodyParam.entry?.[0]?.changes?.[0]?.value;
    const message = changes?.messages?.[0];

    if (message) {
      const phoneNumberId = changes.metadata.phone_number_id;
      const from = message.from; // User's WhatsApp number
      const msgBody = message.text?.body?.toLowerCase(); // Message text

      // Initialize user context if not already set
      if (!userContext[from]) {
        userContext[from] = { state: null, name: null };
      }

      let reply = "Sorry, I didn't understand that.";

      // Respond based on the user's message and context
      switch (userContext[from].state) {
        case null:
          if (msgBody === "hi") {
            reply = `Hi! Please select an option:\n1. Add your name\n2. Add your address\n3. Get a greeting`;
            userContext[from].state = "menu";
          } else {
            reply = `Say 'Hi' to start the conversation.`;
          }
          break;

        case "menu":
          if (msgBody === "1") {
            reply = "Please enter your name:";
            userContext[from].state = "awaiting_name";
          } else if (msgBody === "2") {
            reply = "Please enter your address:";
            userContext[from].state = "awaiting_address";
          } else if (msgBody === "3") {
            if (userContext[from].name) {
              reply = `Hi ${userContext[from].name}! Nice to meet you!`;
            } else {
              reply = "Hi! It seems I don't know your name yet. Please select '1' to add your name.";
            }
            userContext[from].state = "menu";
          } else {
            reply = `Invalid option. Please select:\n1. Add your name\n2. Add your address\n3. Get a greeting`;
          }
          break;

        case "awaiting_name":
          userContext[from].name = msgBody;
          reply = `Thanks, ${msgBody}! You can now select an option:\n1. Add your name\n2. Add your address\n3. Get a greeting`;
          userContext[from].state = "menu";
          break;

        case "awaiting_address":
          userContext[from].address = msgBody;
          reply = `Address saved! You can now select an option:\n1. Add your name\n2. Add your address\n3. Get a greeting`;
          userContext[from].state = "menu";
          break;

        default:
          reply = "Something went wrong. Say 'Hi' to restart.";
          userContext[from].state = null;
      }

      // Send the reply to WhatsApp
      try {
        await axios.post(
          `https://graph.facebook.com/v13.0/${phoneNumberId}/messages?access_token=${token}`,
          {
            messaging_product: "whatsapp",
            to: from,
            text: { body: reply },
          },
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error("Error sending message:", error.response?.data || error.message);
      }

      res.sendStatus(200);
    } else {
      console.log("No message found in the request.");
      res.sendStatus(404);
    }
  } else {
    res.sendStatus(404);
  }
});

// Simple test endpoint
app.get("/", (req, res) => {
  res.status(200).send("Hello! This is the webhook setup.");
});
