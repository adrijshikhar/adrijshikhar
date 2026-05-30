# Pinned GitHub Action SHAs

Pin all third-party actions to a full commit SHA (not a tag) — prevents tag-moving
supply-chain attacks (CWE-1357). Refresh by re-running the `gh api .../commits/<branch>`
commands and updating both this file and the workflows.

| Action | SHA | Resolved release |
|--------|-----|------------------|
| Platane/snk | `d8f6715049803e982ee5ff501b6b9b7d5deeb09b` | v3.5.0 |
| yoshi389111/github-profile-3d-contrib | `f234ae01c07dcb685fd5f259ffc24bacb1fe7314` | latest |
| peaceiris/actions-gh-pages | `84c30a85c19949d7eee79c4ff27748b70285e453` | v4.1.0 |
| actions/checkout | `900f2210b1d28bbbd0bd22d17926b9e224e8f231` | latest |
| actions/github-script | `3a2844b7e9c422d3c10d287c895573f7108da1b3` | latest |

Last refreshed: 2026-05-31
