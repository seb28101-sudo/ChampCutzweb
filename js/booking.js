// ============================================================
// BOOKING PAGE LOGIC
// ============================================================
(function () {
  if (!firebaseReady) {
    document.getElementById("configWarning").style.display = "block";
  }
  const db = firebaseReady ? firebase.firestore() : null;

  let state = {
    step: 1,
    service: null, // full service object
    date: null, // "YYYY-MM-DD"
    time: null, // "HH:MM"
  };

  // ---------- Step 1: services ----------
  const serviceList = document.getElementById("serviceList");
  SERVICES.forEach((svc) => {
    const el = document.createElement("div");
    el.className = "service-option";
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    el.innerHTML = `
      <div>
        <span class="so-name">${svc.name}</span>
        <span class="so-time">${svc.duration} min</span>
      </div>
      <span class="so-price">R${svc.price}</span>
    `;
    el.addEventListener("click", () => {
      document.querySelectorAll(".service-option").forEach((o) => o.classList.remove("selected"));
      el.classList.add("selected");
      state.service = svc;
      document.getElementById("toStep2").disabled = false;
    });
    serviceList.appendChild(el);
  });

  // ---------- Step navigation ----------
  function goToStep(n) {
    state.step = n;
    document.querySelectorAll(".booking-step").forEach((s) => {
      s.classList.toggle("active", Number(s.dataset.step) === n);
    });
    document.querySelectorAll(".step-dot").forEach((d, i) => {
      d.classList.toggle("active", i + 1 === n);
      d.classList.toggle("done", i + 1 < n);
    });
    window.scrollTo({ top: document.querySelector(".booking-shell").offsetTop - 20, behavior: "smooth" });
  }

  document.getElementById("toStep2").addEventListener("click", () => goToStep(2));
  document.getElementById("toStep3").addEventListener("click", () => {
    renderSummary();
    goToStep(3);
  });
  document.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => goToStep(state.step - 1));
  });

  // ---------- Step 2: date + slots ----------
  const dateInput = document.getElementById("dateInput");
  const slotGrid = document.getElementById("slotGrid");
  const slotsStatus = document.getElementById("slotsStatus");
  const toStep3Btn = document.getElementById("toStep3");

  function pad(n) { return String(n).padStart(2, "0"); }
  function toISODate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function minsToHHMM(mins) { return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`; }
  function hhmmToMins(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }

  const today = new Date();
  const minDate = new Date(today);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + SHOP_SETTINGS.bookingWindowDays);
  dateInput.min = toISODate(minDate);
  dateInput.max = toISODate(maxDate);

  dateInput.addEventListener("change", async () => {
    state.date = dateInput.value;
    state.time = null;
    toStep3Btn.disabled = true;
    slotGrid.innerHTML = "";

    if (!state.date) return;

    const d = new Date(state.date + "T00:00:00");
    if (!SHOP_SETTINGS.openDays.includes(d.getDay())) {
      slotsStatus.textContent = "Closed that day — Champ Cutz is open Monday to Friday.";
      return;
    }

    if (!firebaseReady) {
      slotsStatus.textContent = "Booking system not connected yet (see banner above).";
      return;
    }

    slotsStatus.textContent = "Checking availability…";

    try {
      const [bookedSlots, blockedDoc] = await Promise.all([
        db.collection("slots").where("date", "==", state.date).get(),
        db.collection("blockedDates").doc(state.date).get(),
      ]);

      if (blockedDoc.exists) {
        slotsStatus.textContent = "Champ's taken that day off — please pick another date.";
        return;
      }

      const busy = [];
      bookedSlots.forEach((doc) => {
        const b = doc.data();
        const start = hhmmToMins(b.time);
        busy.push([start, start + b.duration]);
      });

      renderAvailableSlots(busy);
    } catch (err) {
      console.error(err);
      slotsStatus.textContent = "Couldn't load availability. Check your connection and try again.";
    }
  });

  function renderAvailableSlots(busyRanges) {
    const openMins = hhmmToMins(SHOP_SETTINGS.openTime);
    const closeMins = hhmmToMins(SHOP_SETTINGS.closeTime);
    const duration = state.service.duration;
    const interval = SHOP_SETTINGS.slotIntervalMins;

    const now = new Date();
    const isToday = state.date === toISODate(now);
    const minStartMins = isToday ? now.getHours() * 60 + now.getMinutes() + SHOP_SETTINGS.minNoticeHours * 60 : -Infinity;

    const slots = [];
    for (let start = openMins; start + duration <= closeMins; start += interval) {
      if (start < minStartMins) continue;
      const end = start + duration;
      const overlaps = busyRanges.some(([bStart, bEnd]) => start < bEnd && end > bStart);
      if (!overlaps) slots.push(start);
    }

    slotGrid.innerHTML = "";
    if (slots.length === 0) {
      slotsStatus.textContent = "No open times left that day for this service — try another date.";
      return;
    }
    slotsStatus.textContent = `${slots.length} time${slots.length === 1 ? "" : "s"} available.`;

    slots.forEach((mins) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot-btn";
      btn.textContent = minsToHHMM(mins);
      btn.addEventListener("click", () => {
        document.querySelectorAll(".slot-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        state.time = minsToHHMM(mins);
        toStep3Btn.disabled = false;
      });
      slotGrid.appendChild(btn);
    });
  }

  // ---------- Step 3: summary + submit ----------
  function renderSummary() {
    const d = new Date(state.date + "T00:00:00");
    const dateLabel = d.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
    document.getElementById("summaryCard").innerHTML = `
      <div><span class="k">Service</span><span class="v">${state.service.name}</span></div>
      <div><span class="k">Date</span><span class="v">${dateLabel}</span></div>
      <div><span class="k">Time</span><span class="v">${state.time}</span></div>
      <div><span class="k">Price</span><span class="v">R${state.service.price}</span></div>
    `;
  }

  const detailsForm = document.getElementById("detailsForm");
  const submitBtn = document.getElementById("submitBtn");
  const submitError = document.getElementById("submitError");

  detailsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitError.style.display = "none";

    if (!firebaseReady) {
      submitError.textContent = "Booking system not connected yet — see the banner at the top of this page.";
      submitError.style.display = "block";
      return;
    }

    const name = document.getElementById("nameInput").value.trim();
    const phone = document.getElementById("phoneInput").value.trim();
    const notes = document.getElementById("notesInput").value.trim();

    submitBtn.disabled = true;
    submitBtn.textContent = "Booking…";

    try {
      // Re-check this exact slot hasn't just been taken by someone else.
      const clash = await db.collection("slots")
        .where("date", "==", state.date)
        .where("time", "==", state.time)
        .get();
      if (!clash.empty) {
        submitError.textContent = "Sorry — that time was just taken. Please pick another.";
        submitError.style.display = "block";
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirm booking";
        goToStep(2);
        dateInput.dispatchEvent(new Event("change"));
        return;
      }

      const bookingRef = await db.collection("bookings").add({
        name, phone, notes,
        service: state.service.name,
        price: state.service.price,
        duration: state.service.duration,
        date: state.date,
        time: state.time,
        status: "confirmed",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      await db.collection("slots").add({
        date: state.date,
        time: state.time,
        duration: state.service.duration,
        bookingId: bookingRef.id,
      });

      const d = new Date(state.date + "T00:00:00");
      const dateLabel = d.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
      document.getElementById("confirmSummary").textContent =
        `${state.service.name} on ${dateLabel} at ${state.time}. See you then, ${name.split(" ")[0]}.`;

      const waText = encodeURIComponent(
        `Hi Champ! Just booked online:\n${state.service.name} — ${dateLabel} at ${state.time}\nName: ${name}\nPhone: ${phone}${notes ? `\nNote: ${notes}` : ""}`
      );
      document.getElementById("whatsappConfirm").href = `https://wa.me/${SHOP_SETTINGS.phoneIntl}?text=${waText}`;

      goToStep(4);
    } catch (err) {
      console.error(err);
      submitError.textContent = "Something went wrong sending your booking. Please try again, or WhatsApp Champ directly.";
      submitError.style.display = "block";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm booking";
    }
  });
})();
