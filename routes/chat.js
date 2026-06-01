const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

router.post('/', async function (req, res) {
    try {
        var message = req.body.message;
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        var endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        var apiKey = process.env.AZURE_OPENAI_API_KEY;
        var deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
        var searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
        var searchKey = process.env.AZURE_SEARCH_KEY;
        var searchIndex = process.env.AZURE_SEARCH_INDEX;

        if (!endpoint || !apiKey || !deployment) {
            return res.status(500).json({
                reply: "Chatbot is not configured yet. Please set up Azure OpenAI credentials in the .env file."
            });
        }

        var apiUrl = endpoint.replace(/\/$/, '') + '/openai/deployments/' + deployment + '/chat/completions?api-version=2024-08-01-preview';

        var body = {
            messages: [
                { role: 'system', content: 'You are EasyLoans Assistant, a friendly chatbot. Answer questions using the provided data. Be concise and use ₹ for currency.' },
                { role: 'user', content: message }
            ],
            max_tokens: 500,
            temperature: 0.7
        };

        // Use Azure AI Search data source if configured
        if (searchEndpoint && searchKey && searchIndex) {
            body.data_sources = [{
                type: 'azure_search',
                parameters: {
                    endpoint: searchEndpoint,
                    index_name: searchIndex,
                    authentication: {
                        type: 'api_key',
                        key: searchKey
                    }
                }
            }];
        }

        var response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            var errText = await response.text();
            console.error('Azure OpenAI error:', response.status, errText);
            return res.status(500).json({
                reply: "Sorry, I'm having trouble connecting right now. Please try again later."
            });
        }

        var data = await response.json();
        var reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "Sorry, I couldn't generate a response.";

        res.json({ reply: reply });

    } catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({
            reply: "Something went wrong. Please try again."
        });
    }
});

module.exports = router;
