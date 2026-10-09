# One account per email, owned by whoever proves it

People can sign in with a password, an emailed sign-in link or Google, and every method for the same email reaches the same account. A user is *claimed* once their email is proven: by a code or link from that inbox, or by Google's verified email. Google and sign-in links join a claimed account, because they prove the email themselves. A password sign-up for a claimed email is refused, because typing an address proves nothing. A user that was never claimed (a sign-up nobody finished) is replaced when another method starts for its email. Our own `createOrUpdateUser` callback enforces this in `packages/backend/convex/accounts/linking.ts`.

## Considered options

- **Convex Auth's default linking.** It links any new sign-in to a user with the same verified email. With email verification on, that includes an unverified password sign-up: someone could attach a password to another person's Google account and overwrite their profile before verifying anything. Rejected.
- **No linking (one account per method).** Safe, but the same person ends up with several accounts. Rejected.

## Consequences

- People who first sign in with Google or a sign-in link have no Home currency or terms acceptance yet. They complete both on `/welcome` before the app opens; the dashboard layout sends them there.
- Someone who started a password sign-up and then uses a sign-in link or Google instead loses the unfinished password account. They can sign up with a password again only if no other method has claimed the email.
- Adding a password to an account that has none (for example, one created with Google) belongs to Account settings and isn't possible yet.
