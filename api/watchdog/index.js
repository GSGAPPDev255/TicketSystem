const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Init Supabase (Server-Side)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // MUST use Service Role to bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function (context, req) {
    try {
        // 1. Find tickets that are OVERDUE, OPEN, and NOT YET FLAGGED
        const now = new Date().toISOString();
        
        const { data: breaches, error } = await supabase
            .from('tickets')
            .select('*, departments(team_email, name)')
            .lt('sla_due_at', now)                 // Due date is in the past
            .neq('status', 'Resolved')             // Not resolved
            .neq('status', 'Closed')               // Not closed
            .is('sla_breached', false);            // Not yet flagged

        if (error) throw error;

        if (!breaches || breaches.length === 0) {
            context.res = { body: { message: "No new breaches found." } };
            return;
        }

        context.log(`🚨 Found ${breaches.length} new SLA breaches.`);

        // 2. Process each breach
        const updates = [];
        
        for (const ticket of breaches) {
            // A. Mark as breached in DB
            const updatePromise = supabase
                .from('tickets')
                .update({ sla_breached: true })
                .eq('id', ticket.id);
            updates.push(updatePromise);

            // B. Send ESCALATION Email
            if (ticket.departments?.team_email) {
                const friendlyId = ticket.ticket_number 
                    ? `SLA-${ticket.ticket_number}` 
                    : `#${ticket.id.slice(0,8)}`;

                await sendEmail(
                    ticket.departments.team_email,
                    `🚨 SLA BREACH: Ticket ${friendlyId} is Overdue`,
                    `
                    <div style="font-family: Arial, sans-serif; color: #333; border: 2px solid #e11d48; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #e11d48; margin-top: 0;">⚠️ SLA BREACH DETECTED</h2>
                        <p><strong>Ticket:</strong> ${friendlyId}</p>
                        <p><strong>Subject:</strong> ${ticket.subject}</p>
                        <p><strong>Due Date:</strong> ${new Date(ticket.sla_due_at).toLocaleString()}</p>
                        <hr/>
                        <p>This ticket has exceeded its Service Level Agreement time limit.</p>
                        <p>Please resolve this immediately.</p>
                        <br/>
                        <a href="https://nice-mud-090814810.2.azurestaticapps.net" style="background-color: #e11d48; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Emergency Ticket</a>
                    </div>
                    `
                );
            }
        }

        await Promise.all(updates);

        context.res = {
            body: { 
                success: true, 
                breaches_processed: breaches.length 
            }
        };

    } catch (error) {
        context.log.error("Watchdog Error:", error);
        context.res = { status: 500, body: error.message };
    }
};

// --- HELPER: EMAIL SENDER (Reused Logic) ---
async function sendEmail(to, subject, body) {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const senderEmail = process.env.SENDER_EMAIL || 'gsgbot@gardenerschools.com';

    // Get Token
    const tokenBody = `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&scope=https://graph.microsoft.com/.default`;
    const tokenRes = await httpsRequest(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        tokenBody
    );

    if (!tokenRes.access_token) return;

    // Send Mail
    await httpsRequest(
        `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
        { 
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${tokenRes.access_token}`, 'Content-Type': 'application/json' } 
        },
        JSON.stringify({
            message: {
                subject: subject,
                body: { contentType: "HTML", content: body },
                toRecipients: [{ emailAddress: { address: to } }]
            },
            saveToSentItems: false
        })
    );
}

function httpsRequest(url, options, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve(body ? JSON.parse(body) : {}));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}
