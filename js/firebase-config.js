/* ============================================================
   FIREBASE CONFIG — fill this in before the booking system works.

   This is what connects the website to a free, shared database so
   that bookings made by clients show up on Champ's dashboard from
   any device, and double-bookings get blocked automatically.

   HOW TO GET THESE VALUES (about 10 minutes, no credit card):
   1. Go to https://console.firebase.google.com and sign in with
      any Google account.
   2. Click "Add project", name it e.g. "champ-cutz", finish setup.
   3. In the left menu, click "Build > Firestore Database" >
      "Create database" > start in PRODUCTION mode > pick a region
      close to South Africa (e.g. europe-west1) > Enable.
   4. Once created, click the "Rules" tab and replace the contents
      with the rules from README.md, then click "Publish".
   5. In the left menu, click "Build > Authentication" > "Get
      started" > enable the "Email/Password" sign-in method.
      Then go to the "Users" tab and click "Add user" — this is
      the login Champ will use on the /admin.html dashboard.
   6. Back in the project overview (gear icon > Project settings),
      scroll to "Your apps", click the </> (web) icon, register
      the app (any nickname), and Firebase will show you a
      firebaseConfig object. Copy those values into the object
      below, replacing the placeholders.
   7. Save this file, commit, and push to GitHub. Done.

   Full step-by-step with screenshots referenced in README.md.
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyA_ykOPyQs4HekEV35XeYTiwbnKtg-D2vw",
  authDomain: "champcutz-74708.firebaseapp.com",
  projectId: "champcutz-74708",
  storageBucket: "champcutz-74708.firebasestorage.app",
  messagingSenderId: "214477630291",
  appId: "1:214477630291:web:d966ed34e158c42dc74fa6",
};

// Shared shop settings used across booking.js and admin.js
const SHOP_SETTINGS = {
  name: "Champ Cutz",
  phoneDisplay: "060 689 3544",
  phoneIntl: "27606893544", // used for wa.me / tel: links, no + or spaces
  instagram: "https://instagram.com/champcutz_",
  address: "5 Dalton Way, Meadowridge, Cape Town",
  openDays: [1, 2, 3, 4, 5], // Mon=1 ... Fri=5 (0 = Sun, 6 = Sat)
  openTime: "10:00",
  closeTime: "15:00",
  slotIntervalMins: 15, // granularity used to search for openings
  minNoticeHours: 2, // don't let clients book less than this far ahead
  bookingWindowDays: 30, // how far into the future clients can book
};

const SERVICES = [
  // EDIT ME — replace with Champ's real services, prices (in ZAR) and
  // durations (in minutes). Duration controls how many slots a booking
  // blocks out, so keep it realistic.
  { id: "skin-fade", name: "Skin Fade", price: 150, duration: 45 },
  { id: "regular-cut", name: "Regular Cut", price: 120, duration: 30 },
  { id: "cut-beard", name: "Cut & Beard Combo", price: 180, duration: 45 },
  { id: "beard-trim", name: "Beard Trim", price: 80, duration: 20 },
  { id: "kids-cut", name: "Kids Cut (under 12)", price: 100, duration: 30 },
  { id: "line-up", name: "Line Up", price: 60, duration: 15 },
];

// Firebase App/Firestore/Auth initialised once and reused by other scripts.
// Uses the CDN "compat" build so it works with plain <script> tags — no
// bundler needed, which keeps this deployable as-is on GitHub Pages.
let firebaseReady = false;
try {
  if (typeof firebase !== "undefined" && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    firebaseReady = true;
  }
} catch (e) {
  console.error("Firebase failed to initialise:", e);
}
