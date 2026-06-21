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
        description: 'Scroll to a homepage section only. Do NOT use this to show or open a hamper preview — use view_hamper for that. Use scroll_to_section only for general navigation (e.g. "take me to contact", "scroll to gallery").',
        parameters: {
            type: 'object',
            properties: { section: { type: 'string', enum: ['home', 'hampers', 'collections', 'gallery', 'about', 'contact'] } },
            required: ['section']
        }
    },
    {
        name: 'show_hampers',
        description: 'Show the whole Trending Hampers grid on the homepage (scroll only — does NOT open a preview). Use when the user wants to browse all hampers generally. If they name or point to ONE hamper ("show me the wedding hamper", "open the third one", "that birthday box"), use view_hamper instead — or pass hamperName/hamperId/index/ordinal here and it will open that hamper preview.',
        parameters: {
            type: 'object',
            properties: {
                hamperName: { type: 'string', description: 'If the user named a specific hamper, pass it here to open that preview instead of only scrolling' },
                hamperId: { type: 'string', description: 'Exact hamper id if known' },
                index: { type: 'number', description: '1-based position in the hamper list (e.g. 3 for the third hamper)' },
                ordinal: { type: 'string', enum: ['first', 'second', 'third', 'fourth', 'fifth', 'last'], description: 'Open hamper by position' }
            }
        }
    },
    {
        name: 'view_hamper',
        description: 'Open ONE specific hamper in a large preview (lightbox) with its image, title and price. REQUIRED whenever the user asks to see, show, or open a particular hamper by name or position ("show me the wedding hamper", "open the birthday one", "the third hamper", "that Virat Kohli box"). This is the ONLY tool that opens the hamper preview — show_hampers and scroll_to_section only scroll to the section.',
        parameters: {
            type: 'object',
            properties: {
                hamperName: { type: 'string', description: 'The hamper name or close description the user mentioned' },
                hamperId: { type: 'string', description: 'Exact hamper id if known from a prior tool response' },
                index: { type: 'number', description: '1-based position in the hamper list' },
                ordinal: { type: 'string', enum: ['first', 'second', 'third', 'fourth', 'fifth', 'last'], description: 'Open hamper by position' }
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
    { name: 'open_checkout', description: 'Open checkout page for the user.' },
    { name: 'open_login', description: 'Open the login/signup popup modal for the user.' }
];

module.exports = { toolDeclarations };
