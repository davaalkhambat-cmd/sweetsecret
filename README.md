# Vercel Redeploy Checklist

This project was reviewed for a fresh Vercel import from GitHub.

## Required after creating a new Vercel project

1. Add all variables from [`.env.example`](/Users/dinaba/Documents/ss%20new%20site%20/.env.example) into Vercel:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`

2. In Firebase Console, add the new Vercel domain to Authentication -> Settings -> Authorized domains.
   - Add both the production domain and the preview domain if you use Google login there.

3. Confirm Firebase project values match the current Firebase project.
   - `authDomain` should usually look like `<project-id>.firebaseapp.com`
   - `storageBucket` should match the active bucket for that Firebase project

4. Redeploy after env variables are saved in Vercel.

## Repo status

- [vercel.json](/Users/dinaba/Documents/ss%20new%20site%20/vercel.json) already contains the SPA rewrite needed for React Router on Vercel.
- [src/firebase.js](/Users/dinaba/Documents/ss%20new%20site%20/src/firebase.js) now fails fast with a clear error if Firebase env variables were not copied into the new Vercel project.
- No old Vercel project id, old domain, or hardcoded deployment URL was found in the codebase.
