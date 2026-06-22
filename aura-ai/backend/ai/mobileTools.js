const mobileToolDeclarations = [
    {
        name: 'show_hampers',
        description:
            'Show curated gift hampers inside the Aura AI screen (do NOT navigate away). Use when the customer asks to see hampers, gift boxes, or curated bundles.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Optional filter e.g. birthday, wedding' }
            }
        }
    },
    {
        name: 'show_gifts',
        description:
            'Show gift products inside the Aura AI screen (do NOT navigate away). Use when browsing gifts, collections, or occasions.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Optional search e.g. birthday, mom' },
                collection: { type: 'string', description: 'Optional collection name from catalog' }
            }
        }
    },
    {
        name: 'navigate_shop',
        description: 'Open the full shop tab only when the customer explicitly wants the entire catalog screen.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'navigate_cart',
        description: 'Open the shopping cart screen.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'navigate_account',
        description: 'Open the customer account screen.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'navigate_checkout',
        description: 'Open checkout when the customer wants to pay. They must be signed in.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'open_sign_in',
        description: 'Open sign in screen inside the app. Use when customer wants to login.',
        parameters: {
            type: 'object',
            properties: {
                email: { type: 'string', description: 'Optional email to pre-fill' }
            }
        }
    },
    {
        name: 'open_sign_up',
        description: 'Open sign up screen inside the app and optionally send OTP.',
        parameters: {
            type: 'object',
            properties: {
                email: { type: 'string', description: 'Email for OTP' },
                sendOtp: { type: 'boolean', description: 'Send OTP immediately when email is available' }
            }
        }
    },
    {
        name: 'verify_sign_up_otp',
        description: 'Verify OTP for sign up after customer speaks the code.',
        parameters: {
            type: 'object',
            properties: {
                email: { type: 'string' },
                otp: { type: 'string' }
            },
            required: ['email', 'otp']
        }
    },
    {
        name: 'view_product',
        description:
            'Highlight a product or hamper in the Aura AI showcase (stay on voice screen). Use after the customer picks an item or asks about a specific id.',
        parameters: {
            type: 'object',
            properties: {
                productId: { type: 'string', description: 'Product id from catalog context' },
                productName: { type: 'string', description: 'Product name if id unknown' }
            }
        }
    },
    {
        name: 'add_to_cart',
        description: 'Add a product to the cart after the customer confirms.',
        parameters: {
            type: 'object',
            properties: {
                productId: { type: 'string' },
                productName: { type: 'string' },
                qty: { type: 'number', description: 'Quantity, default 1' }
            },
            required: ['productId']
        }
    },
    {
        name: 'search_products',
        description:
            'Search gifts and hampers and show matching cards in the Aura AI screen (do NOT open the shop tab).',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string' }
            },
            required: ['query']
        }
    },
    {
        name: 'decrease_cart_qty',
        description: 'Decrease the quantity of a product in the cart or remove it entirely. Use when the customer wants to reduce the quantity of or remove a specific item from the cart.',
        parameters: {
            type: 'object',
            properties: {
                productId: { type: 'string', description: 'Product ID' },
                productName: { type: 'string', description: 'Product name' },
                qty: { type: 'number', description: 'Quantity to decrease by, default 1' }
            },
            required: ['productId']
        }
    },
    {
        name: 'calculate_cart_total',
        description: 'Read the current cart subtotal, shipping, and grand total.',
        parameters: { type: 'object', properties: {} }
    }
];

module.exports = { mobileToolDeclarations };
