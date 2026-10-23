# One account per email, owned by whoever proves it

People can sign in with a password, an emailed sign-in link or Google, and every method for the same email reaches the same account. A user is *claimed* once their email is proven, either by using a code or link from that inbox or by Google vouching for the address. Our own `createOrUpdateUser` callback in `packages/backend/convex/accounts/linking.ts` applies these rules:

- **Nothing changes before proof.** Asking for a sign-in link or starting a sign-up can't disturb anyone else's account; until the email is proven, a new method only joins the existing user.
- **Password sign-ups need an unclaimed email.** A password sign-up for a claimed email is refused, because typing an address proves nothing.
- **Proof clears the unproven.** When a method proves the email of an unclaimed user, other methods on it that never proved the email are removed. Choices made through an unproven password sign-up (terms, Home currency, language) are reset, because whoever made them may not own the inbox.
- **Emails must already be normalized** (trimmed, lower case), so lookalikes such as the Kelvin sign for "K" can't reach another account.
- **Google vouches only for mailboxes it hosts:** Gmail, or a Workspace domain with an `hd` claim. Other Google accounts are refused, and those people use a password or a sign-in link.

## Considered options

- **Convex Auth's default linking.** It links any new sign-in to a user with the same verified email. With email verification on, that includes an unverified password sign-up, so someone could attach a password to another person's Google account and overwrite their profile before verifying anything. Rejected.
- **Replacing an unclaimed user as soon as another method starts.** This is simpler, but anyone could wipe a stranger's sign-up in progress just by asking for a link. Rejected.
- **No linking (one account per method).** Safe, but the same person ends up with several accounts. Rejected.

## Consequences

- Links from emails wait for a click before using their code, because mail scanners open links too.
- Google and sign-in-link newcomers have no Home currency or terms acceptance yet. They complete both once on `/welcome` before the app opens; the dashboard layout sends them there. Later changes to the Home currency go through Account settings, which convert stored amounts.
- Backend functions that act on Collection data should also require a finished sign-up, not just a session.
- An unclaimed user that nobody claims within 7 days is deleted with its methods (`packages/backend/convex/account/unfinishedSignUps.ts`), so addresses people typed don't stay forever.
- Adding a password to an account that has none (one created with Google, say) belongs to Account settings and isn't possible yet.
