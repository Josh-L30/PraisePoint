# Revised CCF entrance preview v2

Date: 2026-11-02. Status: preview-only; awaiting user approval before integration and deployment.

- [Play revised preview](http://127.0.0.1:8765/v2.html) while the local server is running.
- [Saved HTML](../../.superpowers/S14-preview/v2.html)
- [Saved generated artwork](../../.superpowers/S14-preview/greeter-ccf-v2.png)
- Mode: built-in image_gen, reference-guided editing/compositing. No API-key CLI path.
- References: user-supplied CCF door photograph for architecture/signage; previous AI storyboard for the accepted greeter’s appearance.
- Original image and preview retained. The revised PNG is 965×1629 (2,091,708 bytes); CSS frames its three unequal rows without modifying the raster.
- Two preview browser cases passed: play to light login, replay, skip, reduced-motion bypass, narrow reflow and no page errors. Screenshots: [start](S14-ccf-door-v2-start.png), [door open](S14-ccf-door-v2-open.png), [login](S14-ccf-door-v2-login.png), [narrow view](S14-ccf-door-v2-mobile.png). [Browser receipt](S14-ccf-door-v2-browser.json).
- This is a three-keyframe 2.5D camera/crossfade concept, not filmed footage or continuous generated body motion. The interior beyond the photographed entrance is illustrative.
- No app source integration, commit/push, Firebase deploy or backend-data mutation occurred in this revision.

## Final image prompt

Edit the entrance storyboard using two references. Image 1 is the authoritative CCF entrance architecture and signage reference. Image 2 is the previous storyboard: preserve the same fictional adult Filipino male greeter’s face, warm smile, hairstyle, teal short-sleeve shirt, black trousers and shoes, and the three-frame sequence. Replace the old timber church doors and chapel architecture with the modern CCF glass entrance from Image 1.

Output one tall contact sheet with three equal 16:9 landscape frames stacked vertically, no gutters, labels, UI or captions. Photorealistic architectural photography, natural human anatomy and hands, consistent camera/building/light. First frame: clear full-height frameless glass double doors and long stainless steel handles on the left; warm timber-slat feature wall on the right, same gold circular ccf mark and exact white three-line text “CHRIST’S / COMMISSION / FELLOWSHIP”; slatted ceiling, linear lights and polished floor. The accepted smiling greeter stands beside the left doorway at the glass/wood boundary, hand on the handle, leaving the sign visible. Doors closed.

Second frame: same camera and geometry; the greeter holds one clear glass door open inward and gestures toward the unobstructed left-side walking passage. Correct glass hinges and handle positions. Third frame: camera moves closer and slightly left through that door; near glass edge/handle, greeter at the right edge, warm modern neutral lobby/corridor with matching slatted ceiling. The interior is illustrative, not an actual reconstruction. No Catholic altar, pointed chapel arches, statues or old timber chapel doors/pews; match the modern reference. Dignified welcoming natural lighting and skin texture; no extra people, watermarks, advertising, added logos or invented text. Preserve the recognizable CCF signage and approved greeter. This is an AI keyframe concept for a 2.5D web entrance transition, not filmed footage.

## Manual framing polish

The generated row boundaries were at approximately y=614 and y=1175. The open-door viewport starts inside the second row; the final frame is scaled to fill its viewport from the bottom. Visual inspection confirmed the corrected open-door capture has no strip from the previous frame. Replay/skip/reduced-motion checks were repeated after the adjustment. Deployment approval remains pending.
