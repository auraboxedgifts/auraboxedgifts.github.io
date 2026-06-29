function formatInquiryContact(args = {}) {
    const name = String(args.customerName || '').trim();
    const phone = String(args.phone || '').trim();
    const email = String(args.email || '').trim();
    if (name || phone || email) {
        return [
            name ? `Name: ${name}` : '',
            phone ? `Phone: ${phone}` : '',
            email ? `Email: ${email}` : ''
        ]
            .filter(Boolean)
            .join('<br>');
    }
    const legacy = String(args.contact || args.senderInfo || '').trim();
    return legacy || '';
}

function validateInquiryContact(args = {}) {
    const name = String(args.customerName || '').trim();
    const phone = String(args.phone || '').trim();
    const email = String(args.email || '').trim();
    const legacy = String(args.contact || args.senderInfo || '').trim();

    if (name && (phone || email)) {
        return { ok: true, customerName: name, phone, email };
    }
    if (legacy && !/^not provided$/i.test(legacy)) {
        return { ok: true, contact: legacy };
    }
    return {
        ok: false,
        error:
            'Before sending the inquiry, ask the customer for their name and at least one way to reach them (phone number or email). Do not call this tool until you have both.'
    };
}

module.exports = { formatInquiryContact, validateInquiryContact };
