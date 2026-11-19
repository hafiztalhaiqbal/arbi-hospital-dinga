# Connect appointment requests to Google Sheets

This receiver runs on Google Apps Script. It writes appointment requests into a **private** Google Sheet and returns a confirmation page. It does not send WhatsApp messages. The hospital must review every request and contact the patient to confirm the appointment.

## One-time setup (hospital Google account)

1. Create a Google Sheet while signed into the hospital account. Keep its sharing setting restricted to the hospital team. Copy the spreadsheet ID from its URL: the characters between `/d/` and `/edit`.
2. Open [script.google.com](https://script.google.com/) and create a new project.
3. Open `Code.gs` in this folder, copy all of it into the Apps Script editor, and replace `PASTE_PRIVATE_SHEET_ID_HERE` with the spreadsheet ID from step 1. Save.
4. Choose **Deploy → New deployment → Web app**.
5. Set **Execute as** to your account (the account that owns the sheet). Set access to **Anyone** so website visitors can submit without signing in. Deploy and approve Google's requested permissions.
6. Copy the **Web app URL** ending in `/exec` and send that URL to the website maintainer. Do not send your password or make the Sheet public.

The first valid request creates a `Bookings` tab and adds its column headings. New requests are marked `New request`. A matching active doctor/date/time request is refused to reduce double booking. This is request intake only: the sheet is not a live clinical scheduling system, and a request is not an appointment confirmation.

## Publish the website connection

The website maintainer will put the `/exec` URL in `BOOKING_ENDPOINT` in `public/app.js`, then publish the updated site. Until that URL is installed, the website intentionally says that booking is not activated and will not claim that a request was sent.

## Keep patient information private

- Keep the spreadsheet restricted to authorized hospital staff; never use “Anyone with the link” sharing for the Sheet.
- Anyone can technically submit to a public web-app endpoint, though this script checks fields and uses a hidden bot trap. Review unexpected rows and redeploy the Apps Script version after changing its code.
- Only collect details the hospital actually needs, and retain/delete them according to the hospital's own policy.
