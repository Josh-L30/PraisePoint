# Evening Calm refinement and new phone alternatives

Preview gallery: http://127.0.0.1:8767/evening-mobile-compare.html

Full-size responsive preview: http://127.0.0.1:8767/evening-mobile.html?mobile=1

User selected Evening Calm for desktop/tablet and asked for a more transparent panel, while requesting new mobile designs. Preview only: no production changes, commit or deployment.

Desktop/tablet retain the selected composition with panel fill alpha reduced from 232/255 (about 91%) to 58%. Text remains fully opaque. Local backdrop blur is 6px. At widths of 700px and above, both content areas remain side by side, with appropriately smaller tablet typography and spacing. Reduced-transparency preference uses a solid surface and no backdrop blur.

Six different phone compositions below 700px:

1. Open Horizon: separate open headline and dark glass sign-in surface.
2. Sign-in First: the sign-in action precedes the smaller preparation section.
3. Glass Ribbon: full-width band, compact outlined feature symbols.
4. Bare Essentials: open page with no enclosing card.
5. Quiet Dock: short pale sign-in dock, fewer words and small circular feature symbols.
6. Photo & Paper: upper architectural photograph, dark headline band and light sign-in area below.

The last treatment's headline band was darkened after screenshot review exposed weak white-text contrast on its initial pale tint. All six phone screenshots and desktop/tablet screenshots were visually reviewed.

Final Chromium check passed in 11.7 seconds: desktop/tablet/boundary at 1440/834/700px, all six phone options at 390/320px, disabled sign-in, one logo, three features, 44px+ Google touch target, sign-in within the phone viewport, no horizontal overflow, exact desktop alpha and solid text, gallery/picker navigation, responsive gallery and reduced-transparency fallback. No page errors. Phone/tablet checks use viewport emulation. Same reviewed AI-enhanced auditorium image; no additional remote assets or services.

Evidence: S25-preview.json, S25-desktop.png, S25-tablet.png, S25-comparison.png and S25-mobile-{number}-{width}.png.
