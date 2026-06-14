export const translateError = (message: string): string => {
  if (!message) return 'Ein unbekannter Fehler ist aufgetreten.';
  
  const lowerMessage = message.toLowerCase();
  
  // Auth Errors
  if (lowerMessage.includes('invalid login credentials')) {
    return 'E-Mail oder Passwort ist falsch.';
  }
  if (lowerMessage.includes('user already registered')) {
    return 'Diese E-Mail ist bereits registriert.';
  }
  if (lowerMessage.includes('unable to validate email address: invalid format')) {
    return 'Ungültiges E-Mail-Format.';
  }
  if (lowerMessage.includes('password should be at least 6 characters')) {
    return 'Das Passwort muss mindestens 6 Zeichen lang sein.';
  }
  if (lowerMessage.includes('email not confirmed')) {
    return 'Bitte bestätige zuerst deine E-Mail-Adresse.';
  }
  if (lowerMessage.includes('too many requests')) {
    return 'Zu viele Anfragen. Bitte versuche es später erneut.';
  }
  if (lowerMessage.includes('network error') || lowerMessage.includes('failed to fetch')) {
    return 'Netzwerkfehler. Bitte prüfe deine Internetverbindung.';
  }
  if (lowerMessage.includes('email rate limit exceeded')) {
    return 'E-Mail-Limit überschritten. Bitte versuche es später erneut.';
  }
  if (lowerMessage.includes('invalid grant')) {
    return 'Ungültige Anmeldedaten.';
  }
  if (lowerMessage.includes('user not found')) {
    return 'Benutzer nicht gefunden.';
  }

  // RPC / Partner Linking Errors
  if (lowerMessage.includes('self-linking not allowed') || lowerMessage.includes('cannot link to yourself')) {
    return 'Du kannst dich nicht mit dir selbst verknüpfen.';
  }
  if (lowerMessage.includes('invalid partner code') || lowerMessage.includes('partner code not found')) {
    return 'Dieser Code ist ungültig.';
  }
  if (lowerMessage.includes('already linked')) {
    return 'Du bist bereits mit einem Partner verknüpft.';
  }
  if (lowerMessage.includes('code already used')) {
    return 'Dieser Code wird bereits verwendet.';
  }
  if (lowerMessage.includes('du kannst deine antworten nur einmal alle 7 tage zurücksetzen')) {
    return message;
  }

  // Storage Errors
  if (lowerMessage.includes('bucket not found')) {
    return 'Speicher-Fehler. Bitte kontaktiere den Support.';
  }
  if (lowerMessage.includes('payload too large')) {
    return 'Die Datei ist zu groß.';
  }
  
  // Generic fallback
  return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
};
