/**
 * Arbi Hospital Dinga booking receiver.
 * Create a private Google Sheet and paste its ID into SPREADSHEET_ID below.
 * Deploy this project as a Web app that executes as the owner.
 */
const SPREADSHEET_ID = 'PASTE_PRIVATE_SHEET_ID_HERE';
const SHEET_NAME = 'Bookings';
const SITE_URL = 'https://arbi-hospital-dinga.pages.dev/';
const HEADERS = [
  'Received at', 'Reference', 'Status', 'Doctor ID', 'Doctor', 'Booking mode',
  'Visit date', 'Time / arrangement', 'Appointment type', 'Patient name',
  'Phone', 'Age', 'Gender', 'Reason for visit'
];

const DOCTORS = {
  khalid: { name: 'Dr. Khalid', mode: 'slot', closedDays: [5] },
  ahmed: { name: 'Dr. Ahmed', mode: 'slot', closedDays: [5] },
  ehsan: { name: 'Dr. Ehsan', mode: 'slot', closedDays: [0] },
  abuzar: { name: 'Dr. Abu Zar', mode: 'queue', closedDays: [0, 2, 3, 4, 5, 6] }
};

function doGet() {
  return HtmlService.createHtmlOutput(
    '<!doctype html><meta name="viewport" content="width=device-width"><title>Arbi Hospital</title>' +
    '<p>Arbi Hospital Dinga booking connection is ready.</p>'
  );
}

function doPost(e) {
  const p = e && e.parameter ? e.parameter : {};

  // Quietly ignore simple bot submissions to the hidden honeypot.
  if (String(p.website || '').trim()) return resultPage_('Request received', 'Thank you.');

  const booking = validateBooking_(p);
  if (!booking.ok) return resultPage_('Request not saved', booking.message);

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getBookingSheet_();

    if (booking.mode === 'slot' && hasActiveSlot_(sheet, booking)) {
      return resultPage_(
        'That time is no longer available',
        'Another request was already received for this doctor and time. Please return to the website and choose a different time.'
      );
    }

    const reference = 'AH-' + booking.date.replace(/-/g, '') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
    const arrangement = booking.mode === 'queue' ? 'Queue · 11:00 am–2:00 pm' : booking.slot;
    sheet.appendRow([
      new Date(), reference, 'New request', booking.doctorId, booking.doctorName,
      booking.mode, booking.date, plainText_(arrangement), booking.appointmentType,
      plainText_(booking.name), plainText_(booking.phone), booking.age,
      plainText_(booking.gender), plainText_(booking.reason)
    ]);

    return resultPage_(
      'Request sent to Arbi Hospital',
      'Your request was added to the hospital booking sheet. The hospital will contact you to confirm the appointment.' +
      '<p class="reference">Reference: <strong>' + reference + '</strong></p>'
    );
  } catch (error) {
    return resultPage_(
      'We could not save your request',
      'Please try again later or contact the hospital directly. No booking confirmation was created.'
    );
  } finally {
    try { lock.releaseLock(); } catch (_) { /* Lock may not have been acquired. */ }
  }
}

function validateBooking_(p) {
  const doctorId = String(p.doctorId || '').trim();
  const doctor = DOCTORS[doctorId];
  const date = String(p.date || '').trim();
  const slot = String(p.slot || '').trim();
  const appointmentType = String(p.appointmentType || '').trim();
  const name = String(p.name || '').trim();
  const phone = String(p.phone || '').trim();
  const age = Number(p.age);
  const gender = String(p.gender || '').trim();
  const reason = String(p.reason || '').trim();

  if (!doctor || doctor.mode !== String(p.bookingMode || '')) return invalid_('Please choose a valid doctor.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return invalid_('Please choose a valid appointment date.');
  const parsedDate = new Date(date + 'T12:00:00Z');
  if (isNaN(parsedDate.getTime()) || Utilities.formatDate(parsedDate, 'UTC', 'yyyy-MM-dd') !== date) {
    return invalid_('Please choose a valid appointment date.');
  }
  const day = parsedDate.getUTCDay();
  if (doctor.closedDays.indexOf(day) !== -1) return invalid_('This doctor is not available on that day.');
  if (appointmentType !== 'Normal' && appointmentType !== 'Advance') return invalid_('Please choose an appointment type.');
  if (name.length < 2 || name.length > 80) return invalid_('Please enter a valid patient name.');
  if (phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15) return invalid_('Please enter a valid phone number.');
  if (!Number.isInteger(age) || age < 0 || age > 120) return invalid_('Please enter a valid age.');
  if (['Female', 'Male', 'Prefer not to say'].indexOf(gender) === -1) return invalid_('Please choose a gender option.');
  if (reason.length < 2 || reason.length > 220) return invalid_('Please enter a short reason for the visit.');

  if (doctor.mode === 'slot') {
    if (!/^\d{2}:\d{2}$/.test(slot)) return invalid_('Please choose a valid appointment time.');
    const parts = slot.split(':').map(Number);
    const minutes = parts[0] * 60 + parts[1];
    if (parts[0] < 10 || parts[0] >= 19 || parts[1] % 10 !== 0 || parts[1] > 59) {
      return invalid_('Please choose a valid appointment time.');
    }
    if (minutes < 600 || minutes >= 1140) return invalid_('Please choose a valid appointment time.');
  } else if (slot !== '') {
    return invalid_('Queue requests do not use timed slots.');
  }

  return {
    ok: true, doctorId: doctorId, doctorName: doctor.name, mode: doctor.mode,
    date: date, slot: slot, appointmentType: appointmentType, name: name,
    phone: phone, age: age, gender: gender, reason: reason
  };
}

function invalid_(message) { return { ok: false, message: message }; }

function getBookingSheet_() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf('PASTE_') === 0) {
    throw new Error('Set SPREADSHEET_ID before deploying.');
  }
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}

function hasActiveSlot_(sheet, booking) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  // Columns: Status=3, Doctor ID=4, Booking mode=6, Date=7, Time=8.
  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return rows.some(function(row) {
    const status = String(row[2] || '').toLowerCase();
    return String(row[3]) === booking.doctorId &&
      String(row[5]) === 'slot' &&
      String(row[6]) === booking.date &&
      String(row[7]) === booking.slot &&
      status !== 'cancelled' && status !== 'rejected';
  });
}

function plainText_(value) {
  const text = String(value || '').slice(0, 500);
  // Prevent user-provided text from being interpreted as a spreadsheet formula.
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function resultPage_(title, messageHtml) {
  const titleHtml = escapeHtml_(title);
  return HtmlService.createHtmlOutput(
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + titleHtml + ' · Arbi Hospital Dinga</title><style>' +
    'body{margin:0;background:#f7f9fc;color:#17243d;font:16px Arial,sans-serif;display:grid;min-height:100vh;place-items:center}' +
    'main{max-width:560px;margin:24px;padding:32px;background:#fff;border:1px solid #e4e8f0;border-radius:18px;box-shadow:0 16px 48px #12266b12}' +
    'h1{font-size:24px;color:#10296b;margin:0 0 12px}p{line-height:1.65;color:#59677e}.reference{margin-top:20px;padding:12px;background:#f3f6fc;border-radius:8px}.back{display:inline-block;margin-top:12px;padding:12px 18px;background:#1e56e8;color:#fff;text-decoration:none;border-radius:9px;font-weight:bold}' +
    '</style></head><body><main><h1>' + titleHtml + '</h1><p>' + messageHtml + '</p>' +
    '<a class="back" href="' + SITE_URL + '">Return to Arbi Hospital website</a></main></body></html>'
  ).setTitle(titleHtml + ' · Arbi Hospital Dinga');
}

function escapeHtml_(value) {
  return String(value).replace(/[&<>"']/g, function(char) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
  });
}
