# Arbi Hospital Dinga

Responsive static hospital website in `public/`, published with Cloudflare Pages. There is no custom server or database in this project.

## Cloudflare Pages

Use the GitHub repository's `master` branch, leave the build command empty, and set the output directory to `public`.

## Appointment requests

The site can submit requests to a Google Sheet through the Google Apps Script receiver in `apps-script/`. Follow [apps-script/README.md](apps-script/README.md) to create a private Sheet and deploy the receiver. Then set `BOOKING_ENDPOINT` in `public/app.js` to the deployed Web App URL ending in `/exec` and publish the commit. Until configured, the site explicitly reports that booking is not activated and does not say a request was sent.

Requests are not confirmed appointments. Hospital staff must contact the patient and confirm availability. The included receiver does not send WhatsApp messages.
