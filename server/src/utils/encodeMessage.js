/**
 * Encode a message for WhatsApp sharing URL
 */
function encodeWhatsAppMessage(fileName, shareUrl) {
  const message = `📄 *${fileName}*\n\nHi! Please check this file:\n${shareUrl}\n\n_Shared via DriveX_`;
  return encodeURIComponent(message);
}

/**
 * Build the WhatsApp share URL
 */
function buildWhatsAppUrl(fileName, shareUrl) {
  const encoded = encodeWhatsAppMessage(fileName, shareUrl);
  return `https://wa.me/?text=${encoded}`;
}

module.exports = { encodeWhatsAppMessage, buildWhatsAppUrl };
