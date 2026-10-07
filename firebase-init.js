/* ------------------------------------------------------------------
   FIREBASE INIT — Realtime Database bridge for Class Competition mode.

   script.js is a CLASSIC script (not a module), but the modern Firebase
   SDK is distributed as ES modules. This file IS a module (see the
   <script type="module"> tag in index.html) that does the Firebase-side
   work and exposes a small, plain-function API on `window.chemLabCloud`
   so script.js can call it without needing `import` itself.

   Why this matters: competition data used to live in localStorage only,
   which is sandboxed per browser/device — a teacher's code created on
   their laptop was invisible to a student's phone, so joining could
   never work. Realtime Database is a small shared JSON tree all devices
   can read/write over the internet, which is what makes the code/join
   flow actually function across different devices.
------------------------------------------------------------------ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getDatabase, ref, set, get, update, remove, onValue,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
import {
  getAuth, signInAnonymously,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAQIxQIxLuP2urku4ex_hQ3NIjolea2FhM",
  authDomain: "chemlab-44c3a.firebaseapp.com",
  databaseURL: "https://chemlab-44c3a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chemlab-44c3a",
  storageBucket: "chemlab-44c3a.firebasestorage.app",
  messagingSenderId: "326794552723",
  appId: "1:326794552723:web:b4962f29cb10da31c13466",
};

async function setup() {
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  const auth = getAuth(app);

  // Anonymous sign-in: no login screen, no name/password — just gives this
  // browser session a real Firebase auth token. On its own this is NOT a
  // security rule, but it lets the database rules require `auth != null`,
  // which blocks bare REST/curl requests that skip the Firebase SDK
  // entirely, instead of the old test-mode rules that let anyone read or
  // write anything with no token at all, and that expire automatically
  // after 30 days (silently breaking the whole feature if left as-is).
  await signInAnonymously(auth);

  // All competitions live under /competitions/{CODE} in the database tree.
  const competitionRef = (code) => ref(db, 'competitions/' + code);
  const studentRef = (code, name) => ref(db, 'competitions/' + code + '/students/' + name);

  window.chemLabCloud = {
    ready: true,

    // This device's anonymous auth ID — stamped onto a competition when a
    // teacher creates it, so the database rules can later check "is the
    // person editing/deleting this competition the same one who made it?"
    uid: auth.currentUser.uid,

    /** Teacher: create a brand-new competition document. */
    saveCompetition(code, data) {
      return set(competitionRef(code), data);
    },

    /** Student: fetch a competition once (e.g. to validate a join code). */
    async loadCompetition(code) {
      const snap = await get(competitionRef(code));
      return snap.exists() ? snap.val() : null;
    },

    /** Teacher: live-updates whenever anything in this competition changes
     *  (a student joins, a student's progress changes, etc.). Returns an
     *  unsubscribe function — call it when leaving the monitoring view. */
    listenToCompetition(code, callback) {
      const r = competitionRef(code);
      const handler = (snap) => callback(snap.exists() ? snap.val() : null);
      onValue(r, handler);
      return () => onValue(r, handler, { onlyOnce: true }); // best-effort detach
    },

    /** Student: write just THIS student's record — never the whole
     *  competition object, so two students completing experiments at the
     *  same moment can't overwrite each other's progress. */
    saveStudent(code, name, studentData) {
      return set(studentRef(code, name), studentData);
    },

    /** Teacher: remove a competition entirely once it's ended. */
    deleteCompetition(code) {
      return remove(competitionRef(code));
    },
  };

  window.dispatchEvent(new Event('chemlab-cloud-ready'));
}

setup().catch((err) => {
  // Network hiccup, ad-blocker, anonymous sign-in disabled in the Firebase
  // console, bad config, etc. — surface it clearly but don't throw, so the
  // rest of the page still loads. script.js checks `window.chemLabCloud`
  // before using it and falls back to a clear "couldn't connect" message
  // rather than crashing Class mode.
  console.error('❌ Firebase failed to initialize — Class Competition will be unavailable:', err);
  window.chemLabCloud = { ready: false };
  window.dispatchEvent(new Event('chemlab-cloud-ready'));
});
