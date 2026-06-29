const fs = require('fs');

function buildCustomerFromArgs(args = {}) {
    const name = String(args.customerName || '').trim();
    const phone = String(args.phone || '').trim();
    const email = String(args.email || '').trim();
    const legacy = String(args.contact || args.senderInfo || '').trim();
    if (name || phone || email) return { name, phone, email };
    if (legacy) return { name: legacy, phone: '', email: '' };
    return { name: 'Unknown', phone: '', email: '' };
}

function buildInquiryRecord(toolName, args = {}, source = 'web_ai') {
    const customer = buildCustomerFromArgs(args);
    const now = new Date().toISOString();

    if (toolName === 'request_custom_hamper') {
        return {
            id: `req_${Date.now()}`,
            type: 'custom_hamper',
            inquiryType: 'Custom Hamper',
            message: [
                args.occasion ? `Occasion: ${args.occasion}` : '',
                args.recipient ? `For: ${args.recipient}` : '',
                args.budget ? `Budget: ${args.budget}` : '',
                args.preferences ? `Preferences: ${args.preferences}` : ''
            ]
                .filter(Boolean)
                .join('\n'),
            details: {
                occasion: String(args.occasion || ''),
                recipient: String(args.recipient || ''),
                budget: String(args.budget || ''),
                preferences: String(args.preferences || '')
            },
            customer,
            status: 'open',
            source,
            createdAt: now,
            updatedAt: now
        };
    }

    return {
        id: `req_${Date.now()}`,
        type: 'inquiry',
        inquiryType: String(args.inquiryType || 'General'),
        message: String(args.message || ''),
        details: {},
        customer,
        status: 'open',
        source,
        createdAt: now,
        updatedAt: now
    };
}

function readRequests(requestsFile) {
    try {
        return JSON.parse(fs.readFileSync(requestsFile, 'utf8'));
    } catch (_) {
        return [];
    }
}

function writeRequests(requestsFile, requests) {
    fs.writeFileSync(requestsFile, JSON.stringify(requests, null, 2));
}

async function saveInquiryAndNotify(requestsFile, toolName, args, source, notifyFn) {
    const record = buildInquiryRecord(toolName, args, source);
    const requests = readRequests(requestsFile);
    requests.unshift(record);
    writeRequests(requestsFile, requests);
    console.log(`[Inquiries] Saved ${record.id} (${record.inquiryType}) from ${source}`);

    let fcmResult = null;
    if (typeof notifyFn === 'function') {
        try {
            fcmResult = await notifyFn(record);
            const sent = fcmResult?.sent ?? 0;
            const failed = fcmResult?.failed ?? 0;
            const tokens = fcmResult?.tokens ?? 0;
            console.log(
                `[Inquiries] FCM ${record.id}: sent=${sent} failed=${failed} adminTokens=${tokens}`
            );
            if (tokens === 0) {
                console.warn(
                    `[Inquiries] FCM ${record.id}: no admin device tokens — log into the admin app on your phone to register for push alerts`
                );
            }
        } catch (err) {
            console.error(`[Inquiries] FCM ${record.id} failed:`, err.message);
            fcmResult = { error: err.message };
        }
    }
    return { record, fcmResult };
}

function logInquiryToolOutcome(toolName, args, outcome) {
    console.log(
        `[AI_TOOL] ${toolName} done ${JSON.stringify({
            blocked: Boolean(outcome.blocked),
            reason: outcome.error || null,
            email: outcome.email || null,
            inquiryId: outcome.inquiryId || null,
            fcm: outcome.fcm || null,
            customerName: args.customerName || null,
            phone: args.phone ? 'provided' : null,
            emailProvided: args.email ? 'provided' : null
        })}`
    );
}

async function processCustomerInquiry({
    toolName,
    args,
    source,
    requestsFile,
    sendEmailNotification,
    formatInquiryContact,
    validateInquiryContact,
    emailHtml,
    inquiryType
}) {
    const contactCheck = validateInquiryContact(args);
    if (!contactCheck.ok) {
        const outcome = { blocked: true, error: contactCheck.error };
        logInquiryToolOutcome(toolName, args, outcome);
        return { response: { result: 'error', error: contactCheck.error }, outcome };
    }

    const emailResult = await sendEmailNotification(
        emailHtml,
        formatInquiryContact(args),
        inquiryType
    );

    let inquiryId = null;
    let fcmResult = null;
    if (emailResult.success) {
        const { notifyAdminsNewRequest } = require('./fcm');
        const saved = await saveInquiryAndNotify(
            requestsFile,
            toolName,
            args,
            source,
            notifyAdminsNewRequest
        );
        inquiryId = saved.record.id;
        fcmResult = saved.fcmResult;
    } else {
        console.error(`[Inquiries] Email failed for ${toolName}: ${emailResult.error || 'unknown'}`);
    }

    const outcome = {
        blocked: false,
        email: {
            success: emailResult.success,
            to: emailResult.to,
            error: emailResult.error || null
        },
        inquiryId,
        fcm: fcmResult
    };
    logInquiryToolOutcome(toolName, args, outcome);
    return {
        response: emailResult.success ? emailResult : { result: 'error', error: emailResult.error },
        outcome
    };
}

module.exports = {
    buildInquiryRecord,
    readRequests,
    writeRequests,
    saveInquiryAndNotify,
    logInquiryToolOutcome,
    processCustomerInquiry
};
