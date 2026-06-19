function hamperToShowcaseItem(h) {
    return {
        id: String(h.id || ''),
        title: String(h.title || ''),
        subtitle: String(h.subtitle || ''),
        price: Number(h.price) || 0,
        image: String(h.image || ''),
        isHamper: true
    };
}

function productToShowcaseItem(p) {
    return {
        id: String(p.id || ''),
        title: String(p.name || p.title || ''),
        subtitle: String(p.collection || p.subtitle || ''),
        price: Number(p.price) || 0,
        image: String(p.image || ''),
        isHamper: Boolean(p.isHamper)
    };
}

function buildHampersShowcase(getSite, query) {
    const q = String(query || '').trim().toLowerCase();
    let hampers = (getSite().hampers || []).filter((h) => Number(h.price) > 0);
    if (q) {
        hampers = hampers.filter(
            (h) =>
                String(h.title || '').toLowerCase().includes(q) ||
                String(h.subtitle || '').toLowerCase().includes(q)
        );
    }
    return {
        title: q ? `Hampers for “${query.trim()}”` : 'Curated gift hampers',
        items: hampers.slice(0, 12).map(hamperToShowcaseItem)
    };
}

function buildGiftsShowcase(getCatalog, query, collection) {
    const q = String(query || '').trim().toLowerCase();
    const col = String(collection || '').trim().toLowerCase();
    let products = getCatalog();
    if (col) {
        products = products.filter((p) => String(p.collection || '').toLowerCase().includes(col));
    }
    if (q) {
        products = products.filter(
            (p) =>
                String(p.name || '').toLowerCase().includes(q) ||
                String(p.collection || '').toLowerCase().includes(q)
        );
    }
    let title = 'Handpicked gifts';
    if (q && col) title = `${collection} gifts for “${query.trim()}”`;
    else if (q) title = `Gifts for “${query.trim()}”`;
    else if (col) title = `${collection} collection`;
    return {
        title,
        items: products.slice(0, 12).map(productToShowcaseItem)
    };
}

function buildProductShowcase(getSellable, productId, productName) {
    const sellable = getSellable(productId);
    if (!sellable) return null;
    const isHamper = String(productId).startsWith('hamper_');
    return {
        title: productName || sellable.name || 'Featured gift',
        items: [
            productToShowcaseItem({
                id: sellable.id,
                name: sellable.name,
                collection: isHamper ? 'Hamper' : '',
                price: sellable.price,
                image: sellable.image,
                isHamper
            })
        ]
    };
}

function buildSearchShowcase(getCatalog, getSite, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return buildGiftsShowcase(getCatalog, '', '');
    const hamperItems = (getSite().hampers || [])
        .filter(
            (h) =>
                Number(h.price) > 0 &&
                (String(h.title || '').toLowerCase().includes(q) ||
                    String(h.subtitle || '').toLowerCase().includes(q))
        )
        .map(hamperToShowcaseItem);
    const productItems = getCatalog()
        .filter(
            (p) =>
                String(p.name || '').toLowerCase().includes(q) ||
                String(p.collection || '').toLowerCase().includes(q)
        )
        .map(productToShowcaseItem);
    const items = [...hamperItems, ...productItems].slice(0, 12);
    return {
        title: items.length ? `Results for “${query.trim()}”` : `No matches for “${query.trim()}”`,
        items
    };
}

function showcaseMobileAction(showcase) {
    return {
        type: 'showcase',
        title: showcase.title,
        items: showcase.items
    };
}

module.exports = {
    buildHampersShowcase,
    buildGiftsShowcase,
    buildProductShowcase,
    buildSearchShowcase,
    showcaseMobileAction
};
