# S06 quota races

Two independent Postgres connections contended for the last available reservation. Connection A ran in the Supabase SQL editor while B used the connector. Connector-only attempts serialized and are not accepted as overlap proof. Synthetic counter boundaries and metadata descriptors avoided filling real Storage with large files.

| Boundary | First backend / result | Second backend / result | Observed overlap |
| --- | --- | --- | --- |
| Application 500 MiB | 106395 / reserved | 106402 / capacity | 6.90085 s |
| Workspace 50 MiB | 107929 / reserved | 107931 / capacity | 40.32105 s |

[Machine-readable result](S06-concurrency-results.json) includes start/finish epochs and distinct backend IDs. The workspace 35-second attempt did not overlap and remains separately labeled as non-overlap evidence; the 55-second repeat above is authoritative. Holds are test-only SQL transactions, not application delays.

Paired release and exact-marker cleanup removed both fake Google identities and pending reservations. Counters returned to the prior 692 real test-image bytes with zero reserved; the two retained manual test images were subsequently deleted with the user's explicit approval. The later v2 integration report independently confirms zero used/reserved bytes before and after its six-file cleanup. No real account, workspace ownership or church content was removed.
