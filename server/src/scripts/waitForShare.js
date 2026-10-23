const { getSheetsClient, ensureSheetsInitialized } = require('../config/googleSheets');
const config = require('../config/env');

async function watchAndInit() {
  console.log('Listening for your Share button click...');
  console.log('Target Spreadsheet:', config.google.spreadsheetId);
  console.log('Target Email:', config.google.serviceAccountEmail);

  let attempts = 0;
  const maxAttempts = 40; // 2 minutes

  const interval = setInterval(async () => {
    attempts++;
    try {
      const sheets = await getSheetsClient();
      const res = await sheets.spreadsheets.get({
        spreadsheetId: config.google.spreadsheetId,
      });

      // If we reach here, user clicked SHARE!
      clearInterval(interval);
      console.log('\nACCESS GRANTED! Initializing database sheets now...');

      await ensureSheetsInitialized();

      const updated = await sheets.spreadsheets.get({
        spreadsheetId: config.google.spreadsheetId,
      });

      console.log('\nSUCCESS! Database tabs created in Google Sheet:');
      console.log(updated.data.sheets.map((s) => s.properties.title));
      console.log('\nYou can now refresh your Google Sheet to see the Files, Folders, and Shares tables!');
      process.exit(0);
    } catch (err) {
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.log('\nTimed out waiting for Share. Run again after sharing.');
        process.exit(0);
      }
      process.stdout.write('.');
    }
  }, 3000);
}

watchAndInit();
