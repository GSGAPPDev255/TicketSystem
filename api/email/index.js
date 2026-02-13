const https = require('https');

module.exports = async function (context, req) {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
        context.res = { status: 400, body: "Missing 'to', 'subject', or 'body'." };
        return;
    }

    try {
        // 1. GET CREDENTIALS
        const tenantId = process.env.AZURE_TENANT_ID;
        const clientId = process.env.AZURE_CLIENT_ID;
        const clientSecret = process.env.AZURE_CLIENT_SECRET;

        // 2. GET ACCESS TOKEN
        const tokenResponse = await postData(
            `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
            `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&scope=https://graph.microsoft.com/.default`
        );

        if (!tokenResponse.access_token) {
            throw new Error("Failed to obtain access token.");
        }

        // 3. SEND EMAIL VIA GRAPH API
        // REPLACE THIS EMAIL with the specific account you want to send FROM
        const SENDER_EMAIL = "gsgbot@gardenerschools.com"; 

        const emailData = {
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
            saveToSentItems: "false"
        };

        await postJson(
            `https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`,
            tokenResponse.access_token,
            emailData
        );

        context.res = { body: { success: true } };

    } catch (error) {
        context.log.error(error);
        context.res = {
            status: 500,
            body: { error: "Email Failed", details: error.message }
        };
    }
};

// --- HELPERS ---

function postData(url, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }, (res) => handleResponse(res, resolve, reject));
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function postJson(url, token, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ success: true });
            } else {
                handleResponse(res, resolve, reject); // Parse error body
            }
        });
        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
    });
}

function handleResponse(res, resolve, reject) {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(body || '{}');
            if (res.statusCode >= 400) reject(new Error(JSON.stringify(json)));
            else resolve(json);
        } catch (e) {
            resolve({}); // Handle empty 202 responses
        }
    });
}
