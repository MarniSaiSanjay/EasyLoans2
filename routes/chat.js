const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const API_VERSION = '2025-01-01-preview';

async function callAssistantsAPI(endpoint, apiKey, path, method, body) {
    var url = endpoint.replace(/\/$/, '') + '/openai' + path + '?api-version=' + API_VERSION;
    var options = {
        method: method || 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': apiKey }
    };
    if (body) options.body = JSON.stringify(body);
    var response = await fetch(url, options);
    if (!response.ok) {
        var errText = await response.text();
        throw new Error('API error ' + response.status + ': ' + errText);
    }
    return response.json();
}

router.post('/', async function (req, res) {
    try {
        var message = req.body.message;
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        var endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        var apiKey = process.env.AZURE_OPENAI_API_KEY;
        var assistantId = process.env.AZURE_OPENAI_ASSISTANT_ID;

        if (!endpoint || !apiKey || !assistantId) {
            return res.status(500).json({
                reply: "Chatbot is not configured yet. Please set up Azure OpenAI credentials in the .env file."
            });
        }

        // Create a thread with the user's message
        var thread = await callAssistantsAPI(endpoint, apiKey, '/threads', 'POST', {
            messages: [{ role: 'user', content: message }]
        });

        // Run the assistant on the thread
        var run = await callAssistantsAPI(endpoint, apiKey, '/threads/' + thread.id + '/runs', 'POST', {
            assistant_id: assistantId
        });

        // Poll for completion (max 30 seconds)
        var maxAttempts = 15;
        for (var i = 0; i < maxAttempts; i++) {
            await new Promise(function (resolve) { setTimeout(resolve, 2000); });
            run = await callAssistantsAPI(endpoint, apiKey, '/threads/' + thread.id + '/runs/' + run.id, 'GET');
            if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') break;
        }

        if (run.status !== 'completed') {
            return res.status(500).json({
                reply: "Sorry, I took too long to respond. Please try again."
            });
        }

        // Get the assistant's response
        var msgs = await callAssistantsAPI(endpoint, apiKey, '/threads/' + thread.id + '/messages', 'GET');
        var reply = "Sorry, I couldn't generate a response.";
        if (msgs.data && msgs.data[0] && msgs.data[0].content && msgs.data[0].content[0]) {
            reply = msgs.data[0].content[0].text.value;
            // Clean up source annotations like 【4:0†source】
            reply = reply.replace(/【[^】]*】/g, '');
        }

        res.json({ reply: reply });

    } catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({
            reply: "Something went wrong. Please try again."
        });
    }
});

module.exports = router;
