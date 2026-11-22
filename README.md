# LordMarshal 485 music 

A mobile-friendly static storefront starter for LordMarshal's producer products.

## Current status
- Responsive storefront and product cards
- Preview player wired to local MP3 paths
- Product buttons show a clear checkout-not-connected notice
- No payment is collected and no download is falsely promised

## Publish with GitHub Pages
1. Open your repository: https://github.com/LordMarshal-art/lordmarshal-audio-vault
2. Choose **Add file → Upload files**.
3. Upload `index.html` and the `assets` folder from this package.
4. Commit to the `main` branch.
5. In **Settings → Pages**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then Save.
6. Your site will appear at https://lordmarshal-art.github.io/lordmarshal-audio-vault/ after deployment.

## Add your previews
Put your own MP3 files in `assets/audio/` with these exact names:
- `preview-01.mp3`
- `preview-02.mp3`
- `preview-03.mp3`

Use audio you own or are licensed to distribute.

## Before accepting payments
This package is only the storefront. Paystack must be connected through a secure backend (for example Supabase Edge Functions). Never put a Paystack secret key in `index.html` or any public GitHub file. Before launch, confirm actual products, prices/currency, license terms, customer email workflow, and download files.

## Product claims
Replace placeholder prices, product contents, statistics, reviews, and license wording with accurate information before publishing.
