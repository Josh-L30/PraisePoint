# S14 — Free AI video prototype

Date: 2026-11-02. Not integrated or deployed.

Google Flow was selected after checking its current official credit documentation and the signed-in account's 50 daily free credits. One 8-second 16:9 Veo 3.1 Fast generation was approved at 20 credits. No subscription, billing upgrade, paid top-up or Runway generation was used. The user explicitly approved the image-use agreement before upload completion/generation.

Official allowance and model costs: https://support.google.com/flow/answer/16526234. Vidu also advertises 40 monthly free image-animation credits, but was not used: https://www.vidu.com/ai-image-animator.

The corrected single starting image places the fictional greeter's hand on an existing long door handle and removes the extra short handle from the earlier rejected image. The original generated image is retained. Local prototype files live under ignored `.superpowers/S14-preview/`: `ccf-video-start-v3.png`, `flow-video-prompt-v3.txt`, `ccf-door-flow-v3.mp4`, and `v3.html`.

Downloaded video: 2,208,524 bytes, 720p, approximately 8 seconds. This is actual generative video, replacing the prior three-still storyboard. It is not real filmed footage. AI continuity remains imperfect: the greeter changes gripping hands during movement. This prototype is for review, not an approved final entrance.

Preview: http://127.0.0.1:8765/v3.html. It plays the MP4 muted, holds white before revealing the proposed light login, and supports replay, skip, Escape and reduced-motion bypass. The Google sign-in control is explicitly preview-only. Production login remains unchanged. No commit, push or Firebase publication was performed.

Evidence images use the `S14-ccf-video-v3-*` prefix. Browser verification results are recorded separately; the earlier v2 storyboard tests do not verify the v3 video.

Final focused browser run: **3/3 passed in 12.5 seconds**: actual MP4 playback/metadata/white-to-login/replay/skip, reduced-motion narrow layout, and missing-video recovery. An earlier run passed 2/3 with a click timeout while the cloud editor was playing in the background; the final rerun passed after pausing it. Source-element media errors also receive the accessible login fallback.

MP4 SHA-256: `459A06031CECAC857CB6CFC00621F7C621929C81A4EC82F4A97F57F271273285`.

## V4 — Hand continuity correction

The user requested correction of the hand switch. One further 8-second Veo 3.1 Fast video was generated for 20 free credits from the same original uploaded still. The live account showed 30 free credits before this generation. No purchase or subscription was used.

The revised choreography keeps the anatomical right hand on the existing handle, the left arm beside the hip, and the man stepping back/right without crossing the doorway. Playback samples at 0–4 seconds in half-second increments, then 5, 6 and 7.5 seconds were captured for visual inspection. In the inspected opening frames the right hand remains on the handle; the left arm stays lowered until the greeter passes out of view. White is revealed behind the door, with a separate pure-white cover before login.

Paused seeking initially returned stale decoded frames, so those captures were replaced with frames taken during actual playback. The sampling tool's pass only establishes successful extraction; hand continuity was assessed visually, not by an automated anatomy test.

Current review preview: http://127.0.0.1:8765/v4.html. File: `.superpowers/S14-preview/ccf-door-flow-v4.mp4`, 2,504,788 bytes. V3 is retained as rejected history. Final V4 preview browser run: **3/3 passed in 11.9 seconds**, covering playback/white-to-login/replay/skip, reduced motion/narrow layout, and missing-video recovery. No production integration or deployment was performed.
