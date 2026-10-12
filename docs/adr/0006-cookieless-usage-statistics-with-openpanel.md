# Cookieless usage statistics with OpenPanel

We count how the marketing site and the product app are used with OpenPanel's cloud analytics. ADR 0002 removed the template's OpenPanel until analytics were needed; this brings it back on narrower terms. Each site has its own OpenPanel client (`NEXT_PUBLIC_OPENPANEL_CLIENT_ID`), set in Vercel Production only, so local runs, CI and previews send nothing. The statistics must not identify anyone:

- **No cookies and no identity.** OpenPanel sets no cookies, discards the IP address after deriving a rough location and a visitor id that changes daily, and keeps its data in Germany. We never call `identify` or pass a `profileId`, and session replay stays off.
- **Only the path is sent.** Each app's `components/analytics.tsx` sends its own screen views. OpenPanel's automatic tracking would send the full address, and in the app its query string carries sign-in codes, email-confirmation tokens and admin searches. The app also drops a language prefix, replaces route parameters with their names (`/collection/[itemId]`) and doesn't count the admin pages or the design gallery. The marketing site counts its not-found page as `/[locale]/[missing]`, not the mistyped address. The page title sent names only the section ("Collection"): the app sends each screen view as OpenPanel's `screenView` would, but with the shell's title, because a page can name its Item, Album or Catalog entry in the tab. It also sends the referrer with every event, which we cut down to the referring site's origin.
- **Plain script-tag install.** The `@openpanel/nextjs` component queues its init after hydration, so a screen view sent from an effect could be queued first, and `op1.js` takes the first queued call as its init. We queue init ourselves before the first event and load `op1.js` from the same place. The client secret isn't used: it's needed only for server-side events.

## Considered options

- **No analytics, as the marketing site and privacy policy promised.** We have no other way to see which parts of CoinsLite people use. Rejected.
- **Vercel Web Analytics.** Also cookieless, but the team already uses OpenPanel, and its event API leaves room for product events later. Rejected.
- **Server-side events from Convex.** They could count product actions (an Item added, Premium bought) without a script in the page, but they'd need the client secret and an id per account. Left for later.

## Consequences

- The privacy policy names OpenPanel as a processor in every language. The marketing site promises no tracking cookies instead of no analytics. A change to what's sent belongs in the policy too.
- People with a content blocker aren't counted. We don't proxy OpenPanel through our own domain to get around that.
- A visitor counts as new each day, so weekly and monthly unique visitors are overstated.
- A screen view whose path matches the one before is skipped, so going straight from one Item to another counts once. Its title is read when the path changes, which can be before the new page's title is in, so a view can carry the previous section's title.
