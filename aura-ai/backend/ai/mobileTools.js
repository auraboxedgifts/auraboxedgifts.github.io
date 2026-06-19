const mobileToolDeclarations = [
    {
        name: 'navigate_shop',
        description: 'Open the shop / catalog tab in the mobile app.',
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
        name: 'view_product',
        description: 'Open a product detail page by product id from the live catalog.',
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
        description: 'Filter the shop catalog by search query.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string' }
            },
            required: ['query']
        }
    }
];

module.exports = { mobileToolDeclarations };
