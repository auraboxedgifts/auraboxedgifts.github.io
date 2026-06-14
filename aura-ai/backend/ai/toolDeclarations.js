const toolDeclarations = [
    {
        name: 'send_message',
        description: 'Send a message, order request, or custom hamper inquiry.',
        parameters: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                senderInfo: { type: 'string' },
                inquiryType: {
                    type: 'string',
                    enum: ['Order Request', 'Custom Hamper', 'Product Inquiry', 'Bulk Order', 'General']
                }
            },
            required: ['message']
        }
    },
    {
        name: 'browse_collection',
        description: 'Navigate user to collection page.',
        parameters: {
            type: 'object',
            properties: {
                collection: {
                    type: 'string',
                    enum: ['bracelets', 'pendants', 'earrings', 'jhumkas', 'scrunchies', 'claws', 'hairbows', 'rings', 'keychains', 'makeup', 'luxury-hampers', 'affordable-hampers']
                }
            },
            required: ['collection']
        }
    },
    { name: 'navigate_home', description: 'Navigate back to home page.' },
    {
        name: 'scroll_to_section',
        description: 'Scroll to specific section of the homepage.',
        parameters: {
            type: 'object',
            properties: { section: { type: 'string', enum: ['home', 'hampers', 'collections', 'gallery', 'about', 'contact'] } },
            required: ['section']
        }
    },
    {
        name: 'show_hampers',
        description: 'Show the whole Trending Hampers showcase on the homepage. Use when the user asks generally about gift hampers, or wants to browse/see ideas for occasions. The tool response lists every hamper with its price — use those real names and prices. To open ONE specific hamper, use view_hamper instead.'
    },
    {
        name: 'view_hamper',
        description: 'Open a single specific hamper in a large preview (lightbox) with its image, title and price. Use this when the user names or asks to see a particular hamper (e.g. "show me the wedding hamper", "open the birthday one"). Pass the hamperName the user said; pass hamperId too if you got it from a previous show_hampers response.',
        parameters: {
            type: 'object',
            properties: {
                hamperName: { type: 'string', description: 'The hamper name or close description the user mentioned' },
                hamperId: { type: 'string', description: 'Exact hamper id if known from a prior tool response' }
            }
        }
    },
    {
        name: 'request_custom_hamper',
        description: 'Send a customised hamper request/inquiry to the Aura team by email. Use after collecting the details from the user. Always confirm before sending.',
        parameters: {
            type: 'object',
            properties: {
                occasion: { type: 'string', description: 'e.g. Birthday, Wedding, Baby Shower, Anniversary' },
                recipient: { type: 'string', description: 'Who the hamper is for (relationship, gender, age if shared)' },
                budget: { type: 'string', description: 'Approximate budget in INR' },
                preferences: { type: 'string', description: 'Theme, colours, items, or any special notes' },
                contact: { type: 'string', description: 'Customer name, phone, or email to reach them' }
            },
            required: ['occasion']
        }
    },
    { name: 'next_product', description: 'Go to next product image.' },
    { name: 'previous_product', description: 'Go to previous product image.' },
    {
        name: 'view_product',
        description: 'Open a specific product by ordinal or index.',
        parameters: {
            type: 'object',
            properties: {
                index: { type: 'number' },
                ordinal: { type: 'string', enum: ['first', 'second', 'third', 'fourth', 'fifth', 'last'] }
            }
        }
    },
    {
        name: 'add_to_cart',
        description: 'Add currently viewed product to cart.',
        parameters: {
            type: 'object',
            properties: {
                productId: { type: 'string' },
                productName: { type: 'string' },
                productPrice: { type: 'number' }
            }
        }
    },
    {
        name: 'calculate_cart_total',
        description: 'Read cart subtotal, shipping (₹120 when cart not empty), and grand total from the browser cart. Use only when the user asks for totals — not after add_to_cart (that response already includes totals).'
    },
    { name: 'show_cart', description: 'Open shopping cart.' },
    { name: 'open_checkout', description: 'Open checkout page for the user.' }
];

module.exports = { toolDeclarations };
