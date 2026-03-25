# NeedlOS Web — Contexto y Reglas de Arquitectura

> Este documento es la fuente de verdad del proyecto. Léelo antes de tocar cualquier cosa.

---

## ¿Qué es este proyecto?

Aplicación web construida con **Angular 21** que actúa como frontend web de **NeedlOS**, un sistema con backend .NET al que se conectará vía HTTP/REST. Aún no hay backend disponible — la arquitectura está preparada para integrarlo cuando esté listo.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| UI | Angular 21 (Standalone Components) |
| Lenguaje | TypeScript 5.9 |
| SSR | Angular SSR + Express 5 (**instalado pero desactivado**) |
| HTTP | `HttpClient` de `@angular/common/http` |
| Estilos | SCSS con variables centralizadas |
| Testing | Vitest |

---

## Estructura de carpetas

```
needlos-front-web/
├── public/                        # Assets estáticos (imágenes, iconos, fuentes)
├── src/
│   ├── environments/
│   │   ├── environment.ts         # Configuración dev (URL backend dev)
│   │   └── environment.prod.ts    # Configuración prod
│   ├── styles/
│   │   ├── _variables.scss        # Colores, tipografía, espaciados (equivale a Colors.xaml)
│   │   └── _global.scss           # Estilos base de HTML (equivale a Styles.xaml)
│   ├── styles.scss                # Punto de entrada — solo importa los parciales
│   └── app/
│       ├── core/
│       │   └── constants/         # Constantes globales (rutas, claves, etc.)
│       ├── models/                # Interfaces/DTOs del backend (solo datos, sin lógica)
│       ├── services/
│       │   ├── interfaces/        # Contratos de servicios (IApi, etc.)
│       │   └── api.ts             # Cliente HTTP base (generado con ng generate service)
│       ├── pages/                 # Una carpeta por pantalla completa (lazy loaded)
│       │   └── login/             # Generado con: ng generate component pages/login
│       │       ├── login.ts
│       │       ├── login.html
│       │       ├── login.scss
│       │       └── login.spec.ts
│       ├── components/            # Componentes reutilizables (sin lógica de negocio)
│       ├── app.ts                 # Root component
│       ├── app.routes.ts          # Definición de rutas
│       └── app.config.ts          # Providers globales (HttpClient, etc.)
```

---

## Reglas de arquitectura

### 1. Separación de responsabilidades

| Capa | Responsabilidad | Lo que NO debe hacer |
|------|----------------|----------------------|
| `models/` | Interfaces TypeScript que representan datos del backend | Lógica, llamadas HTTP |
| `services/` | Llamar al backend, lógica de infraestructura | Actualizar UI directamente |
| `pages/` | Orquestar la pantalla, conectar servicios con template | Llamadas HTTP directas |
| `components/` | Renderizar UI reutilizable, emitir eventos | Lógica de negocio, llamadas HTTP |

### 2. Cómo crear cada cosa nueva

**Nueva pantalla:**
```bash
ng generate component pages/mi-pagina
```
Luego añadir ruta lazy en `app.routes.ts`:
```typescript
{
  path: 'mi-pagina',
  loadComponent: () => import('./pages/mi-pagina/mi-pagina').then(m => m.MiPagina),
}
```

**Nuevo componente reutilizable:**
```bash
ng generate component components/mi-componente
```

**Nuevo servicio:**
```bash
ng generate service services/mi-servicio
```

**Nuevo modelo de datos** → crear manualmente en `models/mi-modelo.ts` (solo interface TS)

**Nueva constante** → añadir en `core/constants/app-constants.ts`

**Nuevo color o variable de diseño** → añadir en `styles/_variables.scss`

### 3. Navegación

Rutas lazy loaded en `app.routes.ts`. Navegar con `Router.navigate()` o `[routerLink]`:

```typescript
// Nunca instanciar páginas directamente. Siempre vía rutas.
this.router.navigate(['/mi-pagina']);
```

### 4. Inyección de dependencias

```typescript
// Forma moderna Angular (preferida)
export class MiPagina {
  private readonly api = inject(Api);
}
```

`Api` ya está con `providedIn: 'root'` — no necesita registrarse en ningún otro lado.

### 5. Estilos y colores

- Variables en `src/styles/_variables.scss`
- Importar en componentes:
  ```scss
  @use '../../../styles/variables' as *;
  // Usar: $color-primary, $spacing-md, etc.
  ```
- **Nunca** hardcodear colores hex. Siempre usar variables.

### 6. Environments

- URL del backend → `src/environments/environment.ts` → `apiBaseUrl`
- Nunca hardcodear URLs en servicios ni componentes

### 7. Componentes standalone

Todos los componentes son standalone. Importar solo lo que se usa:

```typescript
@Component({
  selector: 'app-mi-componente',
  imports: [RouterLink, FormsModule],  // solo lo necesario
  templateUrl: './mi-componente.html',
  styleUrl: './mi-componente.scss',
})
export class MiComponente {}
```

### 8. SSR — instalado pero desactivado

SSR está instalado (`@angular/ssr` + `express`) pero **no activo**. La app corre como SPA normal.

Archivos SSR presentes y listos (no tocar ni borrar):
- `src/server.ts`
- `src/main.server.ts`
- `src/app/app.config.server.ts`
- `src/app/app.routes.server.ts`

**Para reactivar SSR**, hacer estos dos cambios:

1. En `angular.json` bajo `projects > architect > build > options`, agregar:
```json
"server": "src/main.server.ts",
"outputMode": "server",
"ssr": { "entry": "src/server.ts" }
```

2. En `app.config.ts`, agregar al array `providers`:
```typescript
provideClientHydration(withEventReplay()) // import desde @angular/platform-browser
```

---

## Configuración

- URL del backend → `src/environments/environment.ts` → `apiBaseUrl`
- Constantes de código → `src/app/core/constants/app-constants.ts`
- En producción, Angular CLI selecciona `environment.prod.ts` con `--configuration production`

---

## Contexto para futuras sesiones con IA

- El desarrollador tiene experiencia en **Angular + HTML/CSS** — este es su terreno familiar
- También trabaja en el proyecto desktop WPF/MVVM (`needlos-front-desktop`) — mantener coherencia conceptual entre ambos
- No hay backend aún — no implementar llamadas HTTP reales hasta que esté disponible
- El proyecto está en fase inicial de construcción de UI
- Mantener estilos centralizados en `_variables.scss`, nunca inline hardcodeados
- **Siempre usar `ng generate`** para crear componentes y servicios, nunca crearlos manualmente
