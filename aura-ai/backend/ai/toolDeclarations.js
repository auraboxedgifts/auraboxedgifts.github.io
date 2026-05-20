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
        description: 'Scroll to specific section.',
        parameters: {
            type: 'object',
            properties: { section: { type: 'string', enum: ['home', 'collections', 'gallery', 'about', 'contact'] } },
            required: ['section']
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
        description: 'Calculate cart subtotal, shipping (₹70 when cart not empty), and grand total from the user browser cart. Use after add_to_cart or when user asks price/total.'
    },
    { name: 'show_cart', description: 'Open shopping cart.' },
    { name: 'open_checkout', description: 'Open checkout page for the user.' }
];

module.exports = { toolDeclarations };
