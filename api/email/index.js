const https = require('https');

module.exports = async function (context, req) {
    const { to, subject, body } = req.body;

    // 1. Validate Input
    if (!to || !subject || !body) {
        context.res = { status: 400, body: "Missing 'to', 'subject', or 'body'." };
        return;
    }

    try {
        const tenantId = process.env.AZURE_TENANT_ID;
        const clientId = process.env.AZURE_CLIENT_ID;
        const clientSecret = process.env.AZURE_CLIENT_SECRET;
        const senderEmail = process.env.SENDER_EMAIL || 'gsgbot@gardenerschools.com';

        if (!tenantId || !clientId || !clientSecret) {
            throw new Error("Missing Azure Credentials in Environment Variables.");
        }

        // 2. GET ACCESS TOKEN
        // CRITICAL FIX: encodeURIComponent handles symbols in your Client Secret
        const tokenBody = `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&scope=https://graph.microsoft.com/.default`;
        
        const tokenResponse = await httpsRequest(
            `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            },
            tokenBody
        );

        if (!tokenResponse.access_token) {
            context.log.error("Token Error Response:", tokenResponse);
            throw new Error("Failed to obtain access token from Azure.");
        }

        // 3. SEND EMAIL VIA GRAPH API
        const emailPayload = {
            message: {
                subject: subject,
                body: {
                    contentType: "HTML",
                    content: body
                },
                toRecipients: [
                    { emailAddress: { address: to } }
                ]
            },
            saveToSentItems: false
        };

        await httpsRequest(
            `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
            {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${tokenResponse.access_token}`,
                    'Content-Type': 'application/json'
                }
            },
            JSON.stringify(emailPayload)
        );

        context.res = { body: { success: true } };

    } catch (error) {
        context.log.error("Email Function Error:", error.message);
        context.res = {
            status: 500,
            body: { error: "Email Failed", details: error.message }
        };
    }
};

// --- ROBUST HELPER FUNCTION ---
function httpsRequest(url, options, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = body ? JSON.parse(body) : {};
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(json);
                    } else {
                        reject(new Error(JSON.stringify(json) || res.statusMessage));
                    }
                } catch (e) {
                    reject(new Error("Failed to parse response: " + body));
                }
            });
        });

        req.on('error', (e) => reject(e));
        
        if (data) {
            req.write(data);
        }
        req.end();
    });
}
