#!/bin/bash
# Generate collection pages from image data

COLLECTIONS_DIR="/home/shubharthak/Desktop/auraboxedgifts/collections"
IMAGES_DIR="/home/shubharthak/Desktop/auraboxedgifts/images/web"

declare -A COL_NAMES
COL_NAMES[bracelets]="Bracelets"
COL_NAMES[pendants]="Pendants"
COL_NAMES[earrings]="Earrings"
COL_NAMES[jhumkas]="Jhumkas"
COL_NAMES[scrunchies]="Scrunchies"
COL_NAMES[claws]="Claws"
COL_NAMES[hairbows]="Hair Bows"
COL_NAMES[rings]="Rings"
COL_NAMES[keychains]="Keychains"
COL_NAMES[makeup]="Makeup / Chocolates"
COL_NAMES[luxury-hampers]="Luxury Hampers"
COL_NAMES[affordable-hampers]="Affordable Hampers"

declare -A COL_DESC
COL_DESC[bracelets]="Handcrafted charm bracelets with crystal beads and silver accents. Each piece tells a unique story."
COL_DESC[pendants]="Elegant pendants featuring butterfly, heart, and floral designs in gold and rose-gold tones."
COL_DESC[earrings]="Statement earrings from delicate studs to bold drop designs. Perfect for every occasion."
COL_DESC[jhumkas]="Traditional Indian jhumka earrings with a modern twist. Celebrate heritage in style."
COL_DESC[scrunchies]="Luxurious silk and organza scrunchies with tulip flower accents. Gentle on your hair, gorgeous to look at."
COL_DESC[claws]="Trendy hair claw clips in floral and butterfly designs. Effortless hairstyles, maximum charm."
COL_DESC[hairbows]="Adorable alligator hair clips and bows. Add a playful touch to any hairstyle."
COL_DESC[rings]="Beautiful rings and jewellery cases for the accessory lover. Store and wear in style."
COL_DESC[keychains]="Cute mini bags and keychains that make perfect everyday accessories or thoughtful gifts."
COL_DESC[makeup]="Lip gloss, lip oil tints, eyeshadow palettes, and more. Beauty essentials curated with care."
COL_DESC[luxury-hampers]="Premium gift hampers with curated selections of jewellery, skincare, and treats. The ultimate gift."
COL_DESC[affordable-hampers]="Thoughtful gift hampers at wallet-friendly prices. Because love doesn't need a big budget."

declare -A COL_IMAGES
COL_IMAGES[bracelets]="bracelets"
COL_IMAGES[pendants]="pendents"
COL_IMAGES[earrings]="earings"
COL_IMAGES[jhumkas]="earings"
COL_IMAGES[scrunchies]="scrunchies"
COL_IMAGES[claws]="hairclaws"
COL_IMAGES[hairbows]="aligator-hairpins"
COL_IMAGES[rings]="jwellery-case"
COL_IMAGES[keychains]="mini-bags"
COL_IMAGES[makeup]="lip-gloss lip-oil-tint eyeshadow-palette highlighter facemask-sheets"
COL_IMAGES[luxury-hampers]="eyeshadow-palette facemask-sheets highlighter jwellery-case"
COL_IMAGES[affordable-hampers]="lip-gloss lip-oil-tint mini-bags"

for slug in bracelets pendants earrings jhumkas scrunchies claws hairbows rings keychains makeup luxury-hampers affordable-hampers; do
  name="${COL_NAMES[$slug]}"
  desc="${COL_DESC[$slug]}"
  prefixes="${COL_IMAGES[$slug]}"
  
  # Build image list
  IMAGE_HTML=""
  idx=0
  for prefix in $prefixes; do
    for img in "$IMAGES_DIR"/${prefix}-*.jpeg; do
      if [ -f "$img" ]; then
        fname=$(basename "$img")
        delay=$(echo "scale=2; $idx * 0.1" | bc)
        price=$(( (RANDOM % 15 + 3) * 100 - 1 )) # Random price between 299 and 1799
        IMAGE_HTML+="      <div class=\"col-item col-item-reveal\" style=\"animation-delay: ${delay}s\" onclick=\"if(typeof open === 'function') open(${idx});\">
        <div class=\"col-item-img-wrapper\">
          <img src=\"../images/web/${fname}\" alt=\"${name}\" loading=\"lazy\">
          <div class=\"col-item-zoom\"><i class=\"fas fa-search-plus\"></i></div>
        </div>
        <div class=\"col-item-info\">
          <h3 class=\"col-item-title\">${name}</h3>
          <p class=\"col-item-price\">₹${price}</p>
          <button class=\"btn-add-cart\" onclick=\"event.stopPropagation(); window.parent.postMessage({type:'addToCart', item: '${name}', img: '../images/web/${fname}', price: ${price}}, '*');\"><i class=\"fas fa-shopping-cart\"></i> Add</button>
        </div>
      </div>
"
        idx=$((idx + 1))
      fi
    done
  done

  cat > "$COLLECTIONS_DIR/${slug}.html" << HEREDOC
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — Aura Boxed Gifts</title>
  <meta name="description" content="${desc}">
  
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-755SHG7S3L"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-755SHG7S3L');
  </script>

  <link rel="stylesheet" href="collection.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="icon" type="image/png" href="../images/web/auraboxedgifts.png">
</head>
<body>
  <nav class="col-nav">
    <a href="#" onclick="if(window.parent !== window) { window.parent.postMessage('closeCollection', '*'); } else { window.location.href='../index.html'; } return false;" class="col-nav-back"><i class="fas fa-arrow-left"></i> Back</a>
    <a href="#" onclick="if(window.parent !== window) { window.parent.postMessage('closeCollection', '*'); } else { window.location.href='../index.html'; } return false;" class="col-nav-logo"><img src="../images/web/auraboxedgifts.png" alt="Aura Boxed Gifts"></a>
    <div class="col-nav-links">
      <a href="#" id="navCartIcon" aria-label="Cart" style="position: relative; margin-right: 15px;">
        <i class="fas fa-shopping-cart"></i>
        <span class="nav-cart-badge" id="navCartBadge">0</span>
      </a>
      <a href=\"#\" onclick=\"if(window.parent !== window) { window.parent.postMessage('closeCollection', '*'); } else { window.location.href='../index.html'; } return false;\" class=\"nav-text-link\">Home</a>
      <a href=\"#\" onclick=\"if(window.parent !== window) { window.parent.postMessage('closeCollection', '*'); } else { window.location.href='../index.html#collections'; } return false;\" class=\"nav-text-link\">Collections</a>
      <a href=\"https://www.instagram.com/aura_boxedgifts\" target=\"_blank\"><i class=\"fab fa-instagram\"></i></a>
    </div>
  </nav>

  <section class="col-hero">
    <p class="col-hero-label">Collection</p>
    <h1 class="col-hero-title">${name}</h1>
    <p class="col-hero-desc">${desc}</p>
    <div class="col-hero-divider"></div>
    <p class="col-breadcrumb"><a href="#" onclick="if(window.parent !== window) { window.parent.postMessage('closeCollection', '*'); } else { window.location.href='../index.html'; } return false;">Home</a> &nbsp;/&nbsp; <a href="#" onclick="if(window.parent !== window) { window.parent.postMessage('closeCollection', '*'); } else { window.location.href='../index.html#collections'; } return false;">Collections</a> &nbsp;/&nbsp; ${name}</p>
  </section>

  <section class="col-gallery">
    <div class="col-grid">
${IMAGE_HTML}    </div>
  </section>

  <section class="col-cta">
    <h2 class="col-cta-title">Love what you see?</h2>
    <p class="col-cta-text">DM us on Instagram to order or customize your gift. We'd love to help!</p>
    <a href="https://www.instagram.com/aura_boxedgifts?utm_source=qr&igsh=MTYwbTYzNjJ6anUwdA==" target="_blank" class="col-btn-ig">
      <i class="fab fa-instagram"></i> Order on Instagram
    </a>
  </section>

  <footer class="col-footer">
    <p>&copy; 2026 <a href="#" onclick="if(window.parent !== window) { window.parent.postMessage('closeCollection', '*'); } else { window.location.href='../index.html'; } return false;">Aura Boxed Gifts</a>. All rights reserved. Made by <a href="https://devshubh.me" target="_blank" style="color: var(--rose-gold); text-decoration: underline;">SS</a></p>
  </footer>

  <!-- ═══ CART SIDEBAR ═══ -->
  <div class="cart-overlay" id="cartOverlay"></div>
  <div class="cart-sidebar" id="cartSidebar">
    <div class="cart-header">
      <h3>Your Cart</h3>
      <button class="cart-close" id="cartClose">&times;</button>
    </div>
    <div class="cart-items" id="cartItems">
      <!-- Items dynamically populated here -->
    </div>
    <div class="cart-footer">
      <div class="cart-total">
        <span>Total:</span>
        <span id="cartTotalAmt">₹0</span>
      </div>
      <button class="btn-primary" id="btnCheckout" style="width:100%; margin-top:15px; border-radius:50px;">Proceed to Checkout</button>
    </div>
  </div>

  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script src="../cart.js"></script>
  <script src="lightbox.js"></script>
</body>
</html>
HEREDOC

  echo "✅ Created ${slug}.html"
done
