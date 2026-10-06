export const credentialKey = 'local-figma-sync-code';
export function readCredential() {
  try { return localStorage.getItem(credentialKey) ?? sessionStorage.getItem(credentialKey) ?? ''; }
  catch { return ''; }
}
export function rememberCredential(code: string) {
  try { localStorage.setItem(credentialKey, code); sessionStorage.removeItem(credentialKey); return true; }
  catch { return false; }
}
export function forgetCredential() {
  try { localStorage.removeItem(credentialKey); sessionStorage.removeItem(credentialKey); } catch { /* Browser storage unavailable. */ }
}
