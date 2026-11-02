# Portrait video and centered sidebar arrow — preview only

Review URL: http://127.0.0.1:8767/mobile-entrance-portrait.html

The user rejected both the landscape crop (CCF sign missing) and letterboxing (not full screen), then explicitly approved creating a new portrait AI-video using only available Google Flow free credits. The existing desktop clip is retained.

## Portrait creation

Native image generation recomposed the same fictional greeter/CCF doorway reference into a 9:16 portrait starting frame, then moved and reduced the signage to leave phone-crop margins. The final reference is `.superpowers/S29-preview/mobile-door-start.png`; the exact video prompt is `.superpowers/S29-preview/portrait-video-prompt.txt`. Generated image originals remain under the Codex generated_images session folder. This is reconstructed AI imagery, not filmed footage or an exact architectural record.

Flow project: https://flow.google.com/project/b5b0914a-18ef-4105-8e2c-a200e289cacb

The UI displayed 50 available credits. One Veo 3.1 Fast, 8-second, 9:16 generation was approved at the displayed 20-credit cost. No paid upgrade, purchase or subscription. The service queued the job, then completed it. Downloaded through the UI at the free original 720p option: `Greeter_opening_church_glass_door_a14eb028.mp4`, 2,313,694 bytes. Copied non-destructively to `.superpowers/S29-preview/ccf-mobile-door-v1.mp4` and the isolated preview's `mobile-door-portrait.mp4`.

Verified metadata: 720 × 1280, duration 7.93 seconds. Decoded key frames at 0.1, 1, 2, 3, 4, 5, 5.6 and 7 seconds show the original right-hand grip continuing through opening, a left-hand welcoming gesture, camera movement through the doorway and a white ending. The complete branding is visible during the establishing moment and naturally leaves view as the camera enters. See `S29-video-contact-sheet.png`. Frame inspection initially repeated frame zero because the simple HTTP server cannot seek this media; extracting from a fully buffered blob resolved it, with actual media times verified.

The preview fills portrait phones using cover at 35% center. It keeps the 1.6× door action, ends playback at source time 5.4s to remove the unnecessary generated white hold, then uses the 140ms fade / 160ms handoff into disabled Open Horizon. The original MP4 remains untrimmed. Replay, Escape, reduced-motion bypass and failure/deadline recovery remain available in the preview. No mobile entrance integration or policy change in production.

## Sidebar

Preserved the original 19px PanelLeft and 14px hover/focus ChevronLeft from the previous local revision. Centered the drawn chevron within the right compartment by moving its left offset from 6px to 4.75px; top stays 2.5px. No icon replacement, button-size change or crossfade. Reviewed light and dark screenshots.

## Verification and status

Current production build/typecheck passed. The previous local icon refinement's lint had zero errors and one existing Modal Fast Refresh warning; four shell/component tests passed. After the spacing change, a fresh focused sidebar browser check passed in 12.4s, then all five final Chromium checks passed in 22.5s: real portrait playback/full-screen fit/automatic handoff at 320/390/430px, replay/Escape, reduced-motion/missing-media fallback and hover/focus/collapse in both themes. All captured phone/brand/hand/arrow states were visually reviewed. Device checks use viewport emulation, not physical phones.

No deployment, Git commit/push, Supabase changes or real Google login. Production source diff is limited to AppShell.tsx and themes.css for the arrow; video and its player remain in the isolated local preview awaiting user review.
