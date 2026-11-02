# Gathering preview revision

Preview: http://127.0.0.1:8767/gathering-v2.html

Option 5 now uses a full-viewport auditorium background, with Slides, Songs and Present icons directly below the headline. The original five previews remain available.

The supplied 387 × 516 photo was expanded and enhanced with native image generation into a 1672 × 941 widescreen reconstruction. Some architectural and congregation details are reconstructed, not exact recovered detail. No CSS blur is applied.

Original: `.superpowers/S19-preview/auditorium.png`

Enhanced asset: `.superpowers/S19-preview/auditorium-enhanced-v2.png`

Generation direction: preserve the supplied auditorium viewpoint, curved balconies, blue seats, congregation, suspended screen and lighting trusses; expand naturally to widescreen and sharpen photographic architectural detail without haze, new text or interface graphics.

Focused Playwright checks passed at 1440, 768 and 390 pixels: background fills viewport, all three icons appear, no horizontal overflow, one brand logo, sign-in disabled and no page errors. Screenshots were visually inspected at all three sizes. Results: `S20-preview.json`.

Preview only. No production source, Firebase configuration, authentication or database changes; nothing committed or published.
