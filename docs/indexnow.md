# IndexNow

The helper validates every URL against `https://itwhite.ru`, verifies the checked-in public key file, and prints JSON. It is a dry-run unless `--submit` is present.

```bash
npm run indexnow:dry -- --url /new-page/ --url /updated-page/
npm run indexnow:dry -- --changed-from origin/main
npm run indexnow:dry -- --sitemap dist/client/sitemap.xml
npm run indexnow:submit -- --url /new-page/
```

`--urls-file` accepts a newline-delimited file or a JSON string array. `--changed-from` maps static page files and known shared data files; it stops if a changed source file cannot be mapped safely. Review those files, add every affected canonical as an explicit `--url`, then acknowledge the reviewed gap with `--allow-unmapped`. A local built sitemap is required when a global layout/navigation change affects every canonical URL.

Production submission must run only after the same release, including `public/e8362c67da2696f4a740f4dd6134af7d.txt`, is reachable at `https://itwhite.ru/e8362c67da2696f4a740f4dd6134af7d.txt`. Do not submit unchanged, redirected, `noindex`, query-string, or off-domain URLs.
