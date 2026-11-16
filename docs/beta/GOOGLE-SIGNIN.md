# Sign in with Google (web, iOS, Android)

Follows https://developers.google.com/identity/siwg. Google Cloud console, one project, three OAuth clients.

| Platform                                     | Client type                                                                                                                                    | Set in Render                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Web (also phone browsers on iOS and Android) | **Web application**. Authorized JavaScript origins: `https://YOUR-SITE`. Authorized redirect URI: `https://YOUR-SITE/api/auth/callback/google` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| iOS app                                      | **iOS** (needs the app's bundle ID)                                                                                                            | `GOOGLE_IOS_CLIENT_ID`                     |
| Android app                                  | **Android** (needs the package name and SHA-1 signing fingerprint)                                                                             | `GOOGLE_ANDROID_CLIENT_ID`                 |

Also: OAuth consent screen -> Audience -> **Publish app**, or only test users can sign in.

## What works today

- **Web and phone browsers**: Google's own button (and the account chooser) on the sign-in and sign-up pages. The browser gets an ID token from Google and the server verifies it (signature, issuer, audience, one-time nonce). New accounts take a free seat and can carry a friend code, exactly like email sign-up. The redirect flow stays as the fallback.
- **Server side for the apps**: the server already accepts ID tokens issued to the iOS and Android client IDs above. A native app signs the student in with Google's SDK (iOS: Google Sign-In SDK; Android: Credential Manager) and calls `POST /api/auth/sign-in/social` with `{"provider":"google","idToken":{"token":"<id token>"}}`.

## What is not done

There is no Student Career Studio iOS or Android app. `apps/mobile` is the upstream Reactive Resume app, tied to its own domain and store listings, so I did not add Google's native SDKs to it. When a native app exists: add the SDK, use the client IDs above, and send the token as shown.
