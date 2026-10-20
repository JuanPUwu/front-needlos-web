// Preparación común de las pruebas: cada prueba arranca sin nada recordado en el
// navegador (borradores, preferencias), para que no dependan unas de otras.
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
