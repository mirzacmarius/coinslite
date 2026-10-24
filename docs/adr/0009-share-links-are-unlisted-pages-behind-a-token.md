# Share links are unlisted pages behind a token

CoinsLite had no way to show anyone anything. An Album or a Set can now be shared by a link (spec §8 and §6.4): a read-only page at `/s/<token>` that works signed in or not. The token is 16 random bytes as hex, kept on the share document and compared as it is. It opens nothing but that page, which shows what the owner chose to show, so unlike a sign-in or email-change token a copy of the database would gain nothing from it, and the owner can be shown the link again whenever the dialog opens. Stopping the share deletes the document; there is no expiry, because a link pasted in a chat should keep working until its owner says otherwise.

The page is public to whoever has the link, so it shows an allowlist of each Item's fields (`shares/rules.ts`, `sharedItemFields`), never the record, and Market values only once the owner turns them on. Thumbnails reach the page through the signed photo links that already serve the owner, issued by the public query once the token checked out.

## Considered options

- **Public profiles, or a whole Collection made public.** More to moderate and to explain. A link per Album or Set lets a collector show one thing to one audience, which is what registries and Numista are used for in practice. Profiles can follow, with Marius's say.
- **Storing a hash of the token.** Would stop a database leak from exposing share links, but such a leak would already expose the Items, and the owner could no longer be shown the link again.
- **The token in the URL fragment**, as the email-confirmation link carries its token. The fragment never reaches a server, but a server can't read it either, so link previews in chat apps would have no title; and shared pages are made to be pasted into chats.

## Consequences

- `/s/<token>` is open in the app's proxy; everything else still needs a sign-in.
- The token is in the path, so it reaches the hosting provider's request logs like any address. Error reports and usage statistics replace it with a placeholder (`lib/scrub-address.ts`, `components/analytics.tsx`).
- Shared pages ask search engines not to index them; a link is as private as the people it was given to.
- A new fact Items may show on a shared page goes into `sharedItemFields`, and into the privacy policy, which lists exactly what a shared page shows, in every language.
