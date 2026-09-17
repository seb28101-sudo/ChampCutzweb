# Champ Cutz website

A clean, working booking site for Champ Cutz: homepage, an online booking flow, and a private
dashboard so Champ can manage bookings instead of doing it over WhatsApp.

## 1. Set up the booking system (10 minutes, free, no credit card)

Bookings need somewhere shared to live so a booking made on a client's phone shows up on
Champ's dashboard on his phone. That's Firebase (Google's free tier — no billing required for
this site's usage level).

1. Go to https://console.firebase.google.com, sign in, click **Add project**, name it
   `champ-cutz` (or anything), finish setup.
2. Left menu → **Build → Firestore Database** → **Create database** → start in
   **production mode** → pick a region (e.g. `europe-west1`) → **Enable**.
3. Click the **Rules** tab and paste this in, replacing everything there, then **Publish**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /bookings/{bookingId} {
         allow create: if request.resource.data.keys().hasAll(
           ['name','phone','service','date','time','duration','status']);
         allow read, update, delete: if request.auth != null;
       }
       match /slots/{slotId} {
         allow read: if true;
         allow create: if request.resource.data.keys().hasAll(
           ['date','time','duration','bookingId']);
         allow update, delete: if request.auth != null;
       }
       match /blockedDates/{dateId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

4. Left menu → **Build → Authentication** → **Get started** → enable **Email/Password**.
   Then **Users** tab → **Add user** → this is the login Champ uses on `/admin.html`.
5. Gear icon (top left) → **Project settings** → scroll to **Your apps** → click the **</>**
   web icon → register the app (any nickname, skip hosting) → copy the `firebaseConfig` object
   it shows you.
6. Open `js/firebase-config.js` in this project and paste those values in at the top,
   replacing the `"YOUR_..."` placeholders. Save.

That's it — booking and the admin dashboard will start working once this file is pushed live.

## 2. Put your real details in

- **Prices & services**: `js/firebase-config.js` (the `SERVICES` list) — also update the
  matching numbers in the "Services" section of `index.html` so the homepage price board
  matches.
- **Shop hours / phone / address**: `SHOP_SETTINGS` in `js/firebase-config.js`, plus the
  Contact section and map link in `index.html`.
- **Photos**: drop images into `assets/gallery/` named `gallery-1.jpg` through `gallery-6.jpg`
  and they'll appear automatically (until then, placeholder tiles show).
- **Logo**: already pulled from the Instagram profile picture as `assets/logo.png`. Swap it
  for a higher-res export any time if Champ has one.

## 3. Put it on GitHub Pages

1. Create a new repo on GitHub, and push everything in this folder to it.
2. Repo → **Settings → Pages** → under "Build and deployment", set **Source** to
   **Deploy from a branch**, branch `main`, folder `/ (root)` → **Save**.
3. GitHub gives you a URL like `https://yourname.github.io/repo-name/` — that's the live site.

## How the booking system works

- A client picks a service, then a date/time — the site checks Firestore for anything already
  booked that day and only shows genuinely open slots (accounting for each service's duration
  so appointments can't overlap).
- Submitting writes a `bookings` document (the full details) and a lightweight `slots`
  document (just date/time/duration, used for the availability check) — this is also why
  clients can't read each other's names/numbers, only whether a time is taken.
- After booking, the client gets a one-tap button to also send the same details to Champ on
  WhatsApp — useful as a backup and keeps things familiar.
- `admin.html` (linked in the footer as "Staff Login") requires the email/password login you
  set up in Firebase Auth. From there Champ can see every upcoming booking grouped by day,
  message or cancel any of them, and block off days he's not working.

## File structure

```
index.html          Homepage
booking.html         Client booking flow
admin.html           Password-protected dashboard
css/styles.css       All styling
js/firebase-config.js   Firebase keys + shop settings + services/prices (EDIT THIS)
js/app.js            Shared nav behaviour
js/booking.js        Booking flow logic
js/admin.js          Dashboard logic
assets/logo.png      Cropped shop logo
assets/gallery/      Drop real photos here (gallery-1.jpg ... gallery-6.jpg)
```

## Notes

- The site is plain HTML/CSS/JS — no build step, no npm install. Just static files.
- Until `js/firebase-config.js` has real Firebase values, the booking form and admin
  dashboard will show a clear "not connected yet" message instead of failing silently.
- Address is currently set to "5 Dalton Way, Meadowridge, Cape Town" (from the previous
  site) — the Instagram bio says Constantia, so double check this with Champ and update
  it in `index.html` if it's changed.
