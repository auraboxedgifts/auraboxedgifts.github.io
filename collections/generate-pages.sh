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

# Product name generator from filename
product_name_from_file() {
  local fname="$1"
  local base="${fname%.jpeg}"
  # Remove trailing number: bracelets-10 -> bracelets
  local prefix=$(echo "$base" | sed 's/-[0-9]*$//')
  local num=$(echo "$base" | grep -oP '\d+$')
  
  case "$prefix" in
    bracelets)        echo "Charm Bracelet #${num}" ;;
    pendents)         echo "Pendant Necklace #${num}" ;;
    earings)          echo "Drop Earrings #${num}" ;;
    scrunchies)       echo "Silk Scrunchie #${num}" ;;
    hairclaws)        echo "Hair Claw Clip #${num}" ;;
    aligator-hairpins) echo "Hair Bow Clip #${num}" ;;
    jwellery-case)    echo "Jewellery Case #${num}" ;;
    mini-bags)        echo "Mini Bag Keychain #${num}" ;;
    lip-gloss)        echo "Lip Gloss #${num}" ;;
    lip-oil-tint)     echo "Lip Oil Tint #${num}" ;;
    eyeshadow-palette) echo "Eyeshadow Palette #${num}" ;;
    highlighter)      echo "Highlighter #${num}" ;;
    facemask-sheets)  echo "Face Mask Sheet #${num}" ;;
    *)                echo "${prefix} #${num}" ;;
  esac
}

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
        price=$(( (RANDOM % 15 + 3) * 100 - 1 ))
        pname=$(product_name_from_file "$fname")
        IMAGE_HTML+="      <div class=\"col-item col-item-reveal\" style=\"animation-delay: ${delay}s\" data-idx=\"${idx}\" data-name=\"${pname}\" data-price=\"${price}\" data-img=\"../images/web/${fname}\">
        <div class=\"col-item-img-wrapper\">
          <img src=\"../images/web/${fname}\" alt=\"${pname}\" loading=\"lazy\">
          <div class=\"col-item-zoom\"><i class=\"fas fa-search-plus\"></i></div>
        </div>
        <div class=\"col-item-info\">
          <h3 class=\"col-item-title\">${pname}</h3>
          <p class=\"col-item-price\">Rs. ${price}.00</p>
          <button class=\"btn-add-cart\" data-add-idx=\"${idx}\"><i class=\"fas fa-shopping-cart\"></i> Add to cart</button>
        </div>
      </div>
"
        idx=$((idx + 1))
      fi
    done
  done

  cat > "$COLLECTIONS_DIR/${slug}.html" << 'HEREDOC_START'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
HEREDOC_START

  # Write the dynamic parts
  cat >> "$COLLECTIONS_DIR/${slug}.html" << HEREDOC_DYN
  <title>Aura Boxed Gifts</title>
  <meta name="description" content="${desc}">
HEREDOC_DYN

  cat >> "$COLLECTIONS_DIR/${slug}.html" << 'HEREDOC_MID'
  
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
  <link rel="icon" type="image/jpeg" href="../images/logo.jpeg">
</head>
<body>
  <nav class="col-nav">
    <a href="#" onclick="if(window.parent !== window) { window.parent.postMessage('closeCollection', '*'); } else { window.location.href='../index.html'; } return false;" class="col-nav-back"><i class="fas fa-arrow-left"></i> Back</a>
    <a href="#" onclick="if(window.parent !== window) { window.parent.postMessage('closeCollection', '*'); } else { window.location.href='../index.html'; } return false;" class="col-nav-logo"><img src="../images/logo.jpeg" alt="Aura Boxed Gifts"></a>
    <div class="col-nav-links">
      <a href="#" id="navCartIcon" aria-label="Cart" style="position: relative; margin-right: 15px;">
        <i class="fas fa-shopping-cart"></i>
        <span class="nav-cart-badge" id="navCartBadge">0</span>
      </a>
      <a href="#" onclick="if(window.parent !== window) { window.parent.postMessage('closeCollection', '*'); } else { window.location.href='../index.html'; } return false;" class="nav-text-link">Home</a>
      <a href="#" onclick="if(window.parent !== window) { window.parent.postMessage('closeCollection', '*'); } else { window.location.href='../index.html#collections'; } return false;" class="nav-text-link">Collections</a>
      <a href="https://www.instagram.com/aura_boxedgifts" target="_blank"><i class="fab fa-instagram"></i></a>
    </div>
  </nav>
HEREDOC_MID

  cat >> "$COLLECTIONS_DIR/${slug}.html" << HEREDOC_HERO
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
HEREDOC_HERO

  cat >> "$COLLECTIONS_DIR/${slug}.html" << 'HEREDOC_END'
  <section class="col-cta">
    <h2 class="col-cta-title">Love what you see?</h2>
    <p class="col-cta-text">DM us on Instagram to order or customize your gift. We'd love to help!</p>
    <a href="https://www.instagram.com/aura_boxedgifts?utm_source=qr&igsh=MTYwbTYzNjJ6anUwdA==" target="_blank" class="col-btn-ig">
      <i class="fab fa-instagram"></i> Order on Instagram
    </a>
  </section>

  <!-- Email Subscribe -->
  <section class="col-subscribe">
    <h3>Subscribe to our emails</h3>
    <form class="subscribe-form" onsubmit="event.preventDefault(); this.querySelector('input').value=''; alert('Thank you for subscribing!');">
      <input type="email" placeholder="Email" required>
      <button type="submit"><i class="fas fa-arrow-right"></i></button>
    </form>
  </section>

  <footer class="col-footer">
    <p>&copy; 2026 <a href="#" onclick="if(window.parent !== window) { window.parent.postMessage('closeCollection', '*'); } else { window.location.href='../index.html'; } return false;">Aura Boxed Gifts</a>. All rights reserved. Made by <a href="https://devshubh.me" target="_blank" style="color: var(--rose-gold); text-decoration: underline;">SS</a></p>
  </footer>

  <!-- Cart overlay is created dynamically by cart.js -->
  <link rel="stylesheet" href="../style.css">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script src="../cart.js"></script>
  <script src="lightbox.js"></script>
</body>
</html>
HEREDOC_END

  echo "✅ Created ${slug}.html"
done
