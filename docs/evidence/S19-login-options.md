# Five login directions

2026-11-02. User rejected the full auditorium backdrop preview and requested five alternative login/background layouts before choosing.

Comparison: http://127.0.0.1:8767/compare.html. Full-size selector: http://127.0.0.1:8767/. Local files: ignored `.superpowers/S19-preview/`.

1. Sanctuary split: worship image on the left, clean mint sign-in on the right.
2. Soft glass: one centered glass card over a softened auditorium.
3. Quiet canvas: open editorial layout, inline teal sign-in and separate worship portrait.
4. Evening worship: deep teal sign-in rail and large cinematic worship panel.
5. Gathering banner: auditorium header with an overlapping horizontal welcome/sign-in panel.

All use Figtree, PraisePoint/CCF branding, one CCF mark per design, the user's supplied photos and the existing Google-only sign-in concept. Actual sign-in is explicitly disabled; these are standalone visual previews, with no auth client or backend requests. No generated photos or paid services were used.

QA: all five desktop (1440px) and phone (390px) layouts rendered, selected correctly, kept one logo, preserved the disabled sign-in state and had no viewport horizontal overflow or page errors. All ten captures were visually inspected. Separate comparison-gallery check passed and verified opening concept 3 from its thumbnail. Selector check: 1 passed in 4.6s; gallery check: 1 passed in 2.6s. Captures: `S19-option-{1..5}-{1440|390}.png` and `S19-comparison.png`.

Production source, public files and Firebase configuration are unchanged. Nothing was committed, pushed, integrated or deployed. Awaiting the user's preferred concept or combination.
