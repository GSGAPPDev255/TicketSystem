const https = require('https');

module.exports = async function (context, req) {
    const query = req.query.q || (req.body && req.body.q);

    if (!query || query.length < 3) {
        context.res = { status: 400, body: "Query must be at least 3 characters." };
        return;
    }

    try {
        // 1. Get Credentials
        const tenantId = process.env.AZURE_TENANT_ID;
        const clientId = process.env.AZURE_CLIENT_ID;
        const clientSecret = process.env.AZURE_CLIENT_SECRET;

        if (!tenantId || !clientId || !clientSecret) {
            throw new Error("Missing Azure Credentials.");
        }

        // 2. Get Access Token (FIXED: Added encoding)
        const tokenBody = `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&scope=https://graph.microsoft.com/.default`;
        
        const tokenResponse = await httpsRequest(
            `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
            { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
            tokenBody
        );

        if (!tokenResponse.access_token) {
            context.log.error("Token Error:", tokenResponse);
            throw new Error("Failed to get Azure token.");
        }

        // 3. Search Graph API (Name OR Email)
        // We search both displayName and mail for better results
        const graphUrl = `https://graph.microsoft.com/v1.0/users?$filter=startswith(displayName,'${query}') or startswith(mail,'${query}')&$select=id,displayName,mail,jobTitle,department,mobilePhone&$top=10`;

        const graphResponse = await httpsRequest(
            graphUrl,
            { 
                method: 'GET', 
                headers: { 
                    'Authorization': `Bearer ${tokenResponse.access_token}`,
                    'Content-Type': 'application/json' 
                } 
            }
        );

        // 4. Format for Frontend
        const users = (graphResponse.value || []).map(u => ({
            id: u.id,
            name: u.displayName || 'Unknown',
            email: u.mail || 'No Email',
            role: u.jobTitle || 'Staff',
            department: u.department || 'General'
        }));

        context.res = {
            body: { users: users }
        };

    } catch (error) {
        context.log.error("User Search Error:", error);
        context.res = { status: 500, body: { error: error.message } };
    }
};

// --- ROBUST HELPER (Same as Email API) ---
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
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}
