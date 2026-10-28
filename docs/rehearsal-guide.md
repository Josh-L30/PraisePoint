# Gather rehearsal guide

Use this later with the church laptop, projector and speakers. Independent software review is complete and its fixes passed verification: 251 unit/component and 45 production-browser checks. This guide does not mark the real equipment as accepted.

## 1. Get ready online

Plug in the laptop. Use a normal current desktop Chrome or Edge profile, with the original images/videos and a separate backup available. Use the same profile and address throughout the rehearsal.

In VSCode, open this project and run:

```powershell
npm run build
npm run preview
```

Keep that terminal open. Open [the local production app](http://127.0.0.1:4173). If that port already has this app running, use its existing window instead of starting another copy. Go Live and the Vite development address are not the offline rehearsal app.

Sign in with your configured Google account. Google is currently in Testing mode; other volunteers need their access configured before trying this.

## 2. Make a realistic service

In Service plans, open or create a service with actual church words and files. Include lyrics, Scripture, sermon notes, an announcement and a welcome/closing slide. Try both manually entered and pasted lyrics. Include one image, a moving worship background and a standalone video with sound.

Review the saved service slides. Confirm spelling, line breaks, order and layout. Keep the originals; a prepared browser copy is not your backup.

## 3. Connect the projector

Connect the projector and speakers. On Windows, press Win + P and choose Extend. In Gather, choose Present service, then Open projector. A separate black window should open.

Move that window onto the projector display. Click inside it and press F for fullscreen. Return to the operator window on the laptop and choose Send current slide. The congregation should see only the slide, with no operator controls.

If the popup is blocked, allow this site's popup and retry Open projector. A newly opened or reopened output intentionally stays black until Send current slide.

## 4. Follow the singers manually

Use Next slide and Previous slide. Try Right arrow/Space and Left arrow while focus is outside text fields; Space on a focused button activates that button. Try a thumbnail, Go to slide and a service-section button.

Have someone read from the back of the room. Check words, margins, line breaks, image fit and long/non-Latin text under normal room lighting. Write down the slide number of any problem.

Choose Blackout, confirm a completely black projector, then Restore output. Close/reopen the output once and confirm that it requires Send current slide again.

## 5. Check motion and sound

Advance between lyric slides in the same song. The moving background should continue smoothly and remain silent. Try Pause backgrounds, advance a slide, then Resume backgrounds; its position should be preserved.

On the standalone-video slide, choose Play video. Listen through the actual room speakers. Check Video volume, Pause video, Restart video and the position slider. Only the projector window should produce sound. Blackout should pause/mute standalone video; Restore output should leave it paused until you choose Play video.

If playback is blocked, follow the on-screen recovery message. If a required file cannot play on this laptop, replace/relink it and prepare again before the service.

## 6. Prove the saved offline copy

Save all changes first, then finish app updates while you still have internet and the preview server is running. Close editor/preview and presenter windows after saving. If an update asks you to close and reopen, close all Gather windows and fully quit Chrome/Edge, then reopen the same browser profile/address and verify the saved service again. Keep site data; clearing it removes prepared copies.

Exit the presenter and close any deck editor/full-window preview tabs. In the saved service's slide review, choose Prepare for offline and wait for completion. Open prepared services, choose Verify prepared copy and require Ready offline.

Bookmark [Prepared services](http://127.0.0.1:4173/offline). Close all Gather operator/projector windows. In the preview terminal, press Ctrl + C to stop the local server. Disconnect Wi-Fi/network and fully close Chrome/Edge, then reopen the same browser profile and the bookmarked address.

Stopping the local server matters: disconnecting Wi-Fi alone still leaves localhost reachable. This check must load the cached app with both unavailable.

Choose Verify prepared copy again, then Open prepared service. Open projector and Send current slide. Run the actual words, image, background and standalone video. No Google login should be required. Do not sign out or clear browser/site data between preparation and this check; those actions remove prepared access.

If it fails, reconnect, restart npm run preview at the same address, review the error and prepare again. Keep the originals and your fallback presentation available.

## 7. Try recovery and a full service

Reconnect when finished. Download service metadata and copy it with the exact original media onto a USB drive or another safe location. On a second laptop, first open the app online, sign in with permitted access, import into the intended workspace, relink the originals in Media library and prepare there. Repeat the disconnected restart on that laptop. Missing or wrong files should refuse readiness.

Also rehearse for the expected full service duration on the real laptop. Watch heat, fan noise, storage, video stutter and delayed button response. Try Reduce transparency if useful. Keep a known-good fallback ready.

A local 4173 copy does not move to a future public website address. After publication is separately approved, repeat preparation and offline restart on that exact hosted address.

## 8. Record what happened

| Item | Your result |
| --- | --- |
| Date and operator | |
| Laptop model, Windows version | |
| Chrome/Edge version | |
| Projector model/resolution/connection | |
| Speaker/output device | |
| Service title and rehearsal duration | |
| Words readable from the back | Pass / problem slide numbers |
| Manual navigation and blackout | Pass / details |
| Background continuity and pause | Pass / details |
| Standalone sound and recovery | Pass / details |
| Server stopped + disconnected browser restart | Pass / exact error |
| Second laptop relink/restart | Pass / pending / details |
| Actual phone browsing and laptop OS/browser zoom | Pass / pending / details |
| Account/backup owner | Project requester, for now |
| Substitute operator and off-laptop backup location | |
| Issues or changes requested | |

Share the results and any exact error messages here. Do not send passwords, Google secrets or database connection strings. [Release checklist](release-checklist.md) also tracks provider Free/billing confirmation, isolated database restore, branding, volunteer access and eventual hosted verification.
