const { getSheetsClient, ensureSheetsInitialized } = require('../config/googleSheets');
const config = require('../config/env');

async function testAndInit() {
  console.log('Testing connection to Spreadsheet ID:', config.google.spreadsheetId);
  console.log('Service account email:', config.google.serviceAccountEmail);

  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.get({
      spreadsheetId: config.google.spreadsheetId,
    });

    console.log('CONNECTED TO SPREADSHEET:', res.data.properties.title);
    console.log('Current sheets:', res.data.sheets.map((s) => s.properties.title));

    console.log('Initializing required sheets (Files, Folders, Shares)...');
    await ensureSheetsInitialized();

    const updated = await sheets.spreadsheets.get({
      spreadsheetId: config.google.spreadsheetId,
    });
    console.log('SUCCESS! All database sheets ready:', updated.data.sheets.map((s) => s.properties.title));
  } catch (err) {
    if (err.message && err.message.includes('The caller does not have permission')) {
      console.error('\n>>> PERMISSION ERROR:');
      console.error('The spreadsheet has NOT been shared with the service account yet.');
      console.error('Please share your spreadsheet with:', config.google.serviceAccountEmail);
      console.error('Role: Editor');
    } else {
      console.error('ERROR:', err.message);
    }
  }
}

testAndInit();
