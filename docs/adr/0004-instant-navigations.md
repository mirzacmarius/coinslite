# Navigate like a single-page app

Both Next.js apps enable Cache Components and Partial Prefetching. Each route is prerendered into a static shell; whatever reads the request (cookies, headers, the URL) or uncached data sits inside a Suspense boundary and streams in. A link prefetches one shell per route, so clicking it shows the next screen at once while the rest streams. In development Next.js reports any navigation that would wait on the server.

## Consequences

- The session is read from cookies, so the product app's root layout wraps the Convex auth provider in Suspense and marks it per request with `connection()`: a page load paints the static frame first, then streams the rest. Moving between pages never re-renders that layout. The same goes for the deleted-account check in the dashboard layout; anything that reads the session and then touches the clock or random numbers must sit below `connection()`.
- A screen that only shows translated text is a client component (`Overview`, `PlaceholderPage`): the dictionary is already in the browser, so it renders the moment a link is clicked. Page titles still come from the server; a page that shows one Item, Album or Catalog entry adds its name in the browser once its data is in.
- The language is read from the URL's `[locale]` (a root param: the proxy rewrites every page there), never from the request's headers, so server-rendered text is part of a route's static shell. The five languages are prerendered with `generateStaticParams`, and a link prefetches its shell from that static output without a server render.
- Since Next.js 16.4, `ensureStatic` holds this in place. The dashboard sets `'prefetch'`: its links only ever prefetch static output. The Plans page reads the visitor's country below `navigation()`, once the link is followed. The marketing site sets `'navigation'`, so the build fails if any of its pages reads the request.
- Sign-up and welcome read the browser's languages in the shell, so the form is ready the moment the link is clicked; links to them cost a server render each.
- Sign-in, sign-up, verify and reset read `next` (and sign-up the browser's languages) inside Suspense; a page load shows a skeleton until the form streams in.
- Nothing may read the clock or random numbers while a shell is prerendered. Cache such values with `"use cache"` and `cacheLife`, as the marketing site's footer does for the year.
- After a link click the previous page stays in the DOM, hidden, so going back is instant.
- CI builds both apps: a route that can't produce its shell only fails at build time.
