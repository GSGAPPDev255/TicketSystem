const https = require('https');

module.exports = async function (context, req) {
    const query = req.query.q || (req.body && req.body.q);

    if (!query || query.length < 3) {
        context.res = {
            status: 400,
            body: "Please provide a search query of at least 3 characters."
        };
        return;
    }

    try {
        // 1. GET CREDENTIALS FROM ENVIRONMENT
        const tenantId = process.env.AZURE_TENANT_ID;
        const clientId = process.env.AZURE_CLIENT_ID;
        const clientSecret = process.env.AZURE_CLIENT_SECRET;

        // 2. GET ACCESS TOKEN
        const tokenResponse = await postData(
            `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
            `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&scope=https://graph.microsoft.com/.default`
        );

        if (!tokenResponse.access_token) {
            throw new Error("Failed to obtain access token from Azure.");
        }

        // 3. SEARCH GRAPH API
        const graphData = await getData(
            `https://graph.microsoft.com/v1.0/users?$filter=startswith(displayName,'${query}')&$select=displayName,mail,id,jobTitle,department&$top=5`,
            tokenResponse.access_token
        );

        // 4. FORMAT RESPONSE
        const users = graphData.value.map(u => ({
            name: u.displayName,
            email: u.mail,
            id: u.id,
            role: u.jobTitle || 'Staff',
            department: u.department || 'General'
        }));

        context.res = {
            body: { users }
        };

    } catch (error) {
        context.log.error(error);
        context.res = {
            status: 500,
            body: { error: "Internal Server Error", details: error.message }
        };
    }
};

// --- HELPER FUNCTIONS (Since Node https is verbose) ---

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

function getData(url, token) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }, (res) => handleResponse(res, resolve, reject));
        req.on('error', reject);
        req.end();
    });
}

function handleResponse(res, resolve, reject) {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        try {
            resolve(JSON.parse(body));
        } catch (e) {
            reject(e);
        }
    });
}
