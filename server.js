require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const router = require("./src/router");
const scheduler = require("./src/scheduler");
const errorAlerts = require("./src/errorAlerts");

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// 1) Webhook verification (Meta calls this once when you configure the webhook URL)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("Webhook verified successfully.");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// 2) Incoming messages — routed to sales / dispatch / feedback agents
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // ack immediately so Meta doesn't retry

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) return; // delivery/read receipts etc — ignore

    const from = message.from;
    const text = message.text?.body;

    if (!text) return; // non-text message; extend here if you need media support

    await router.route(from, text);
  } catch (err) {
    await errorAlerts.notifyOwnerOfError("incoming WhatsApp message handling", err);
  }
});

app.get("/", (req, res) => {
  res.send("Medical books & journals AI agent system is running.");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  scheduler.start();
});
