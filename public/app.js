const doctors = [
  { id: 'khalid', name: 'Dr. Khalid', image: 'images/dr_khalid.webp', booking: 'slot', schedule: 'Mon–Thu, Sat–Sun', hours: '10:00 am – 7:00 pm', closed: [5], note: '10-minute appointments' },
  { id: 'ahmed', name: 'Dr. Ahmed', image: 'images/dr_ahmed.webp', booking: 'slot', schedule: 'Mon–Thu, Sat–Sun', hours: '10:00 am – 7:00 pm', closed: [5], note: '10-minute appointments' },
  { id: 'ehsan', name: 'Dr. Ehsan', image: 'images/dr_ehsan.webp', booking: 'slot', schedule: 'Mon–Sat', hours: '10:00 am – 7:00 pm', closed: [0], note: '10-minute appointments' },
  { id: 'abuzar', name: 'Dr. Abu Zar', image: 'images/dr_abuzar.webp', booking: 'queue', schedule: 'Monday & Wednesday', hours: '11:00 am – 2:00 pm', closed: [0, 2, 3, 4, 5, 6], note: 'First-come, first-served queue' },
];

const grid = document.querySelector('#doctor-grid');
const dialog = document.querySelector('#booking-dialog');
const content = document.querySelector('#booking-content');
const sessionTaken = new Set(); // Demonstration only. This is not a shared or hospital booking record.
const state = { step: 1, doctor: null, date: '', slot: '', kind: 'Normal', person: {} };
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function cardMarkup(d, index) {
  const queue = d.booking === 'queue';
  return `<article class="doctor-card"><div class="doctor-photo-wrap"><img class="doctor-photo" src="${d.image}" alt="${d.name}" loading="lazy"><span class="doctor-ordinal">0${index + 1} / 04</span></div><div class="doctor-info"><h3 class="doctor-name">${d.name}</h3><p class="doctor-credential">Arbi Hospital Dinga</p><span class="doctor-badge ${queue ? 'queue' : 'slot'}"><i></i>${queue ? 'Queue appointment' : 'By appointment'}</span><div class="doctor-card-foot"><span class="schedule-small">${d.schedule}</span><button class="doctor-book" data-doctor="${d.id}">Book <span>↗</span></button></div></div></article>`;
}
grid.innerHTML = doctors.map(cardMarkup).join('');
document.querySelector('#year').textContent = new Date().getFullYear();

function dateKey(date) {
  const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function dateFromKey(value) { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d, 12); }
function dateLabel(value, long = false) {
  const date = dateFromKey(value);
  return long ? `${weekdays[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}` : `${monthNames[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
}
function doctorDates(doctor) {
  const result = [];
  for (let offset = 0; offset < 30 && result.length < 10; offset++) {
    const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + offset);
    if (!doctor.closed.includes(date.getDay())) result.push(dateKey(date));
  }
  return result;
}
function timeSlots(doctor, date) {
  const startHour = doctor.booking === 'queue' ? 11 : 10;
  const endHour = doctor.booking === 'queue' ? 14 : 19;
  const result = [];
  const current = new Date();
  const isToday = date === dateKey(current);
  for (let mins = startHour * 60; mins < endHour * 60; mins += 10) {
    if (isToday && mins <= current.getHours() * 60 + current.getMinutes()) continue;
    const hh24 = Math.floor(mins / 60); const mm = mins % 60;
    const suffix = hh24 >= 12 ? 'pm' : 'am'; const hh = hh24 % 12 || 12;
    result.push({ value: `${String(hh24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, label: `${hh}:${String(mm).padStart(2, '0')} ${suffix}` });
  }
  return result;
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function setStep(step) {
  state.step = step;
  document.querySelectorAll('.step').forEach((el, index) => {
    el.classList.toggle('active', index + 1 === step);
    el.classList.toggle('done', index + 1 < step);
  });
}
function ensureDoctorDate() {
  if (!state.doctor) return;
  const dates = doctorDates(state.doctor);
  if (!dates.includes(state.date)) state.date = dates[0] || '';
  const slots = state.doctor.booking === 'slot' ? timeSlots(state.doctor, state.date) : [];
  if (!slots.some((slot) => slot.value === state.slot)) state.slot = slots.find((slot) => !sessionTaken.has(`${state.doctor.id}|${state.date}|${slot.value}`))?.value || '';
}
function bookingForm() {
  const doctor = state.doctor;
  const dates = doctorDates(doctor);
  const queue = doctor.booking === 'queue';
  const slots = queue ? [] : timeSlots(doctor, state.date);
  const available = slots.filter((slot) => !sessionTaken.has(`${doctor.id}|${state.date}|${slot.value}`));
  return `<div class="field-group"><label class="form-label">Choose your doctor</label><div class="doctor-select-grid">${doctors.map((d) => `<button class="doctor-option ${d.id === doctor.id ? 'selected' : ''}" type="button" data-pick-doctor="${d.id}"><img src="${d.image}" alt=""><span><b>${d.name}</b><small>${d.booking === 'queue' ? 'Queue appointment' : 'By appointment'}</small></span></button>`).join('')}</div></div>
  <div class="field-group"><label class="form-label" for="booking-date">${queue ? 'Choose a queue day' : 'Choose a date'}</label><div class="date-row">${dates.map((date) => { const d = dateFromKey(date); return `<button type="button" class="date-chip ${state.date === date ? 'selected' : ''}" data-date="${date}"><small>${weekdays[d.getDay()].slice(0, 3)}</small><b>${monthNames[d.getMonth()].slice(0, 3)} ${d.getDate()}</b></button>`; }).join('')}</div>${queue ? '<div class="queue-callout"><span>◷</span><div><b>Queue visits, Monday & Wednesday · 11:00 am–2:00 pm</b><small>Patients are seen in order. A token is only a front-end preview and is not issued by the hospital.</small></div></div>' : ''}</div>
  ${queue ? `<div class="field-group"><label class="form-label" for="booking-visit-kind">Appointment type</label><div class="choice-pair"><button type="button" class="choice-chip ${state.kind === 'Normal' ? 'selected' : ''}" data-kind="Normal">Normal</button><button type="button" class="choice-chip ${state.kind === 'Advance' ? 'selected' : ''}" data-kind="Advance">Advance</button></div></div>` : `<div class="field-group"><label class="form-label">Choose a time · ${doctor.hours}</label><div class="slot-grid">${slots.map((slot) => { const key = `${doctor.id}|${state.date}|${slot.value}`; const blocked = sessionTaken.has(key); return `<button type="button" class="slot-chip ${state.slot === slot.value ? 'selected' : ''}" data-slot="${slot.value}" ${blocked ? 'disabled' : ''}>${slot.label}</button>`; }).join('')}</div><p class="time-hint">10-minute appointment times. ${available.length} options currently shown in this demo.</p></div><div class="field-group"><label class="form-label" for="booking-kind">Appointment type</label><div class="choice-pair"><button type="button" class="choice-chip ${state.kind === 'Normal' ? 'selected' : ''}" data-kind="Normal">Normal</button><button type="button" class="choice-chip ${state.kind === 'Advance' ? 'selected' : ''}" data-kind="Advance">Advance</button></div></div>`}
  <div class="booking-error" aria-live="polite"></div><div class="dialog-actions"><button class="button button-secondary" type="button" data-cancel>Cancel</button><button class="button button-primary" type="button" data-next>Continue <span>→</span></button></div>`;
}
function patientForm() {
  const p = state.person;
  return `<div class="form-grid"><div class="field-group"><label class="form-label" for="patient-name">Full name</label><input class="field" id="patient-name" name="name" autocomplete="name" placeholder="Your full name" value="${escapeHtml(p.name)}" required></div><div class="field-group"><label class="form-label" for="patient-phone">Phone number</label><input class="field" id="patient-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="03XX XXXXXXX" value="${escapeHtml(p.phone)}" required></div><div class="field-group"><label class="form-label" for="patient-age">Age</label><input class="field" id="patient-age" name="age" type="number" min="0" max="120" placeholder="Age in years" value="${escapeHtml(p.age)}" required></div><div class="field-group"><label class="form-label" for="patient-gender">Gender</label><select class="field" id="patient-gender" name="gender" required><option value="">Choose</option>${['Female', 'Male', 'Prefer not to say'].map((v) => `<option ${p.gender === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div><div class="field-group"><label class="form-label" for="patient-reason">Reason for visit</label><textarea class="field" id="patient-reason" name="reason" rows="3" maxlength="220" placeholder="Briefly tell us what you need help with" style="height:auto;min-height:74px;padding:10px 11px;resize:vertical" required>${escapeHtml(p.reason)}</textarea></div><p class="form-footnote">Only the basic details needed for this request. This front-end demo does not send or save your information.</p><div class="booking-error" aria-live="polite"></div><div class="dialog-actions"><button class="button button-secondary" type="button" data-back>Back</button><button class="button button-primary" type="button" data-next>Review request <span>→</span></button></div>`;
}
function review() {
  const doctor = state.doctor;
  const time = doctor.booking === 'queue' ? 'Queue visit · Monday & Wednesday, 11:00 am–2:00 pm' : `${state.slotLabel || timeSlots(doctor, state.date).find((v) => v.value === state.slot)?.label || ''} · ${doctor.hours}`;
  return `<div class="summary-card"><div class="summary-head"><img src="${doctor.image}" alt=""><div><b>${doctor.name}</b><small>Arbi Hospital Dinga · ${doctor.booking === 'queue' ? 'Queue appointment' : '10-minute appointment'}</small></div></div><div class="summary-fields"><div><small>DATE</small><b>${dateLabel(state.date, true)}</b></div><div><small>TIME / ARRANGEMENT</small><b>${escapeHtml(time)}</b></div><div><small>APPOINTMENT TYPE</small><b>${state.kind} booking request</b></div><div><small>PATIENT</small><b>${escapeHtml(state.person.name)}, ${escapeHtml(state.person.age)} years</b></div><div><small>PHONE</small><b>${escapeHtml(state.person.phone)}</b></div><div><small>GENDER</small><b>${escapeHtml(state.person.gender)}</b></div><div style="grid-column:1/-1"><small>REASON FOR VISIT</small><b>${escapeHtml(state.person.reason)}</b></div></div></div><p class="form-footnote">This is a front-end preview. Submitting does not reserve a real appointment or notify the hospital.</p><div class="booking-error" aria-live="polite"></div><div class="dialog-actions"><button class="button button-secondary" type="button" data-back>Edit details</button><button class="button button-primary" type="button" data-submit>Submit demo request <span>→</span></button></div>`;
}
function success() {
  const isQueue = state.doctor.booking === 'queue';
  const ref = `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  if (!isQueue) sessionTaken.add(`${state.doctor.id}|${state.date}|${state.slot}`);
  return `<div class="success-mark">✓</div><h3 class="success-title">Your request preview is ready</h3><p class="success-copy">Here’s a copy of the information you entered. The hospital has not received this request, and your appointment is not booked yet.</p><div class="demo-reference"><span>DEMO REFERENCE</span><strong>${ref}</strong></div>${isQueue ? '<p class="success-warning">Queue token numbers are not assigned by this demo. Please contact the hospital to confirm a queue visit.</p>' : `<p class="success-warning">This selected time is now marked unavailable in this browser session only. It has not been reserved at the hospital.</p>`}<div class="summary-card" style="margin-top:14px"><div class="summary-fields" style="padding-top:0"><div><small>DOCTOR</small><b>${state.doctor.name}</b></div><div><small>DATE</small><b>${dateLabel(state.date, true)}</b></div><div><small>TIME / ARRANGEMENT</small><b>${isQueue ? 'Queue visit' : escapeHtml(timeSlots(state.doctor, state.date).find((s) => s.value === state.slot)?.label || '')}</b></div><div><small>APPOINTMENT TYPE</small><b>${state.kind}</b></div><div style="grid-column:1/-1"><small>PATIENT</small><b>${escapeHtml(state.person.name)} · ${escapeHtml(state.person.phone)}</b></div></div></div><div class="success-actions"><button class="button button-primary" type="button" data-finish>Done <span>✓</span></button></div>`;
}
function render() {
  setStep(state.step);
  if (state.step === 1) content.innerHTML = bookingForm();
  else if (state.step === 2) content.innerHTML = patientForm();
  else if (state.step === 3) content.innerHTML = review();
  else content.innerHTML = success();
}
function openBooking(doctorId = doctors[0].id) {
  state.step = 1; state.doctor = doctors.find((d) => d.id === doctorId) || doctors[0]; state.date = ''; state.slot = ''; state.kind = 'Normal'; state.person = {}; state.slotLabel = '';
  ensureDoctorDate(); render(); dialog.showModal();
}
document.addEventListener('click', (event) => {
  const bookingTrigger = event.target.closest('[data-open-booking]');
  if (bookingTrigger) { event.preventDefault(); openBooking(); return; }
  const doctorTrigger = event.target.closest('[data-doctor]');
  if (doctorTrigger) { openBooking(doctorTrigger.dataset.doctor); return; }
  if (event.target.closest('.dialog-close') || event.target.closest('[data-cancel]')) { dialog.close(); return; }
  const selectDoctor = event.target.closest('[data-pick-doctor]');
  if (selectDoctor) { state.doctor = doctors.find((d) => d.id === selectDoctor.dataset.pickDoctor); state.date = ''; state.slot = ''; ensureDoctorDate(); render(); return; }
  const dateChoice = event.target.closest('[data-date]');
  if (dateChoice) { state.date = dateChoice.dataset.date; state.slot = ''; ensureDoctorDate(); render(); return; }
  const slotChoice = event.target.closest('[data-slot]');
  if (slotChoice) { state.slot = slotChoice.dataset.slot; state.slotLabel = slotChoice.textContent; render(); return; }
  const kindChoice = event.target.closest('[data-kind]');
  if (kindChoice) { state.kind = kindChoice.dataset.kind; render(); return; }
  if (event.target.closest('[data-back]')) { state.step = state.step === 3 ? 2 : 1; render(); return; }
  if (event.target.closest('[data-next]')) {
    const error = content.querySelector('.booking-error');
    if (state.step === 1) {
      if (!state.date || (state.doctor.booking === 'slot' && !state.slot)) { error.textContent = state.doctor.booking === 'queue' ? 'Choose an available queue day to continue.' : 'Choose an available time to continue.'; return; }
      state.step = 2; render(); return;
    }
    const form = content.querySelector('.dialog-body') || content;
    const name = content.querySelector('#patient-name');
    if (!name) return;
    const elements = ['#patient-name', '#patient-phone', '#patient-age', '#patient-gender', '#patient-reason'].map((selector) => content.querySelector(selector));
    const invalid = elements.find((el) => !el.checkValidity());
    if (invalid) { invalid.reportValidity(); return; }
    const phone = content.querySelector('#patient-phone');
    if (!/[0-9+()\-\s]{7,}/.test(phone.value) || phone.value.replace(/\D/g, '').length < 7) { content.querySelector('.booking-error').textContent = 'Enter a valid phone number to continue.'; phone.focus(); return; }
    state.person = { name: name.value.trim(), phone: phone.value.trim(), age: content.querySelector('#patient-age').value, gender: content.querySelector('#patient-gender').value, reason: content.querySelector('#patient-reason').value.trim() };
    state.step = 3; render(); return;
  }
  if (event.target.closest('[data-submit]')) { state.step = 4; render(); return; }
  if (event.target.closest('[data-finish]')) { dialog.close(); return; }
});
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
const menuToggle = document.querySelector('.menu-toggle');
menuToggle.addEventListener('click', () => {
  const nav = document.querySelector('.nav-links'); const open = nav.classList.toggle('open'); menuToggle.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.nav-links a').forEach((link) => link.addEventListener('click', () => {
  document.querySelector('.nav-links').classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false');
}));
