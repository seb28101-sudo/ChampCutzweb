// ============================================================
// ADMIN DASHBOARD LOGIC
// ============================================================
(function () {
  if (!firebaseReady) {
    document.getElementById("configWarning").style.display = "block";
  }
  const db = firebaseReady ? firebase.firestore() : null;
  const auth = firebaseReady ? firebase.auth() : null;

  document.getElementById("infoPhone").textContent = SHOP_SETTINGS.phoneDisplay;

  const loginView = document.getElementById("loginView");
  const dashView = document.getElementById("dashView");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.style.display = "none";
    if (!firebaseReady) {
      loginError.textContent = "Not connected yet — see the banner above.";
      loginError.style.display = "block";
      return;
    }
    const email = document.getElementById("emailInput").value.trim();
    const pass = document.getElementById("passInput").value;
    try {
      await auth.signInWithEmailAndPassword(email, pass);
    } catch (err) {
      loginError.textContent = "Couldn't log in — check the email and password.";
      loginError.style.display = "block";
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", () => auth.signOut());

  if (firebaseReady) {
    auth.onAuthStateChanged((user) => {
      if (user) {
        loginView.style.display = "none";
        dashView.style.display = "block";
        loadBookings();
        loadBlockedDates();
      } else {
        loginView.style.display = "block";
        dashView.style.display = "none";
      }
    });
  }

  // ---------- Bookings ----------
  function pad(n) { return String(n).padStart(2, "0"); }
  function toISODate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

  async function loadBookings() {
    const listEl = document.getElementById("bookingsList");
    listEl.innerHTML = `<div class="empty-state">Loading bookings…</div>`;
    try {
      const todayISO = toISODate(new Date());
      // Single equality filter only (no range + orderBy combo), so this never
      // needs a manual Firestore composite index. Date filtering and sorting
      // for past bookings happens below, in plain JavaScript.
      const snap = await db.collection("bookings")
        .where("status", "==", "confirmed")
        .get();

      const upcoming = [];
      snap.forEach((doc) => {
        const b = doc.data();
        if (b.date >= todayISO) upcoming.push({ id: doc.id, ...b });
      });
      upcoming.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

      if (upcoming.length === 0) {
        listEl.innerHTML = `<div class="empty-state">No upcoming bookings yet. Once a client books online, it'll show up here.</div>`;
        return;
      }

      const byDate = {};
      upcoming.forEach((b) => {
        if (!byDate[b.date]) byDate[b.date] = [];
        byDate[b.date].push(b);
      });

      listEl.innerHTML = "";
      Object.keys(byDate).sort().forEach((date) => {
        const d = new Date(date + "T00:00:00");
        const label = d.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
        const group = document.createElement("div");
        group.className = "day-group";
        group.innerHTML = `<h3>${label}</h3>`;
        byDate[date].forEach((b) => {
          const row = document.createElement("div");
          row.className = "booking-row";
          const waLink = `https://wa.me/27${b.phone.replace(/^0/, "").replace(/\D/g, "")}`;
          row.innerHTML = `
            <span class="time-chip">${b.time}</span>
            <div class="b-info">
              <div class="b-name">${escapeHtml(b.name)}</div>
              <div class="b-meta">${escapeHtml(b.service)} · ${b.duration} min · R${b.price} · ${escapeHtml(b.phone)}${b.notes ? ` · "${escapeHtml(b.notes)}"` : ""}</div>
            </div>
            <div class="b-actions">
              <a class="icon-btn" href="${waLink}" target="_blank" rel="noopener">WhatsApp</a>
              <button class="icon-btn danger" data-cancel="${b.id}">Cancel</button>
            </div>
          `;
          group.appendChild(row);
        });
        listEl.appendChild(group);
      });

      listEl.querySelectorAll("[data-cancel]").forEach((btn) => {
        btn.addEventListener("click", () => cancelBooking(btn.dataset.cancel));
      });
    } catch (err) {
      console.error(err);
      listEl.innerHTML = `<div class="empty-state">Couldn't load bookings. Refresh to try again.</div>`;
    }
  }

  async function cancelBooking(bookingId) {
    if (!confirm("Cancel this booking? This can't be undone.")) return;
    try {
      await db.collection("bookings").doc(bookingId).update({ status: "cancelled" });
      const slotSnap = await db.collection("slots").where("bookingId", "==", bookingId).get();
      const deletes = [];
      slotSnap.forEach((doc) => deletes.push(doc.ref.delete()));
      await Promise.all(deletes);
      loadBookings();
    } catch (err) {
      console.error(err);
      alert("Couldn't cancel that booking — try again.");
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- Blocked dates ----------
  async function loadBlockedDates() {
    const listEl = document.getElementById("blockedList");
    listEl.innerHTML = "";
    try {
      const todayISO = toISODate(new Date());
      const snap = await db.collection("blockedDates").where(firebase.firestore.FieldPath.documentId(), ">=", todayISO).get();
      if (snap.empty) {
        listEl.innerHTML = `<li style="color:var(--muted);">No days off booked in.</li>`;
        return;
      }
      snap.forEach((doc) => {
        const d = new Date(doc.id + "T00:00:00");
        const label = d.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });
        const li = document.createElement("li");
        li.innerHTML = `<span>${label}</span><button class="icon-btn danger" data-unblock="${doc.id}">Remove</button>`;
        listEl.appendChild(li);
      });
      listEl.querySelectorAll("[data-unblock]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          await db.collection("blockedDates").doc(btn.dataset.unblock).delete();
          loadBlockedDates();
        });
      });
    } catch (err) {
      console.error(err);
      listEl.innerHTML = `<li style="color:var(--muted);">Couldn't load days off.</li>`;
    }
  }

  document.getElementById("blockForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const dateVal = document.getElementById("blockDateInput").value;
    if (!dateVal) return;
    try {
      await db.collection("blockedDates").doc(dateVal).set({ blockedAt: firebase.firestore.FieldValue.serverTimestamp() });
      document.getElementById("blockDateInput").value = "";
      loadBlockedDates();
    } catch (err) {
      console.error(err);
      alert("Couldn't block that date — try again.");
    }
  });
})();
