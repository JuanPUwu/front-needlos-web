/**
 * Ambiente de DESARROLLO (ng serve / ng build --configuration development).
 * apiUrl se resuelve segun el host desde el que se abre la app:
 *  · localhost           -> http://localhost:8080 (backend local)
 *  · needlos.com (tunel) -> https://api.needlos.com
 */
function resolverApiUrl(): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return host === 'localhost' || host === '127.0.0.1'
    ? 'http://localhost:8080'
    : 'https://api.needlos.com';
}

export const environment = {
  production: false,
  apiUrl: resolverApiUrl(),
  googleClientId: '298283901566-aqg61uis4q6j5epk143a1elt2jepgngj.apps.googleusercontent.com',
};
