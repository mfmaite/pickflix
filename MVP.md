# Pickflix — Plan del MVP

## Context

Vos y un grupo de amigos quieren armar un club de cine y la fricción más grande hoy es **elegir qué ver**: a todos les gustan cosas distintas y la decisión termina dilatándose. La idea es una app web donde un usuario registrado crea una **sesión** (una "juntada"), carga las películas sugeridas, comparte un link, y los invitados entran (sin necesidad de cuenta) a votar Sí / No / Tal vez. Al cerrar la sesión, la app calcula el **top 3** del grupo.

Este plan define el MVP, identifica los riesgos principales, y propone una secuencia incremental de tasks para ir desarrollando de a poco sin frenarte en decisiones grandes.

El repo está en estado *create-next-app* limpio: Next.js 16.2.6 (App Router) + React 19 + Tailwind v4 + TS. No hay código de dominio todavía.

---

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| API de películas | **TMDB** (gratis, key inmediata, posters, español) |
| Mecanismo de voto | **Sí / No / Tal vez** |
| Participantes | Solo el **creador** se registra. Invitados entran por link y ponen un alias |
| Quién sugiere películas | Solo el **creador** carga las películas antes de compartir el link |
| Postgres | **Neon vía Vercel Marketplace** (env vars autoprovisionadas) |
| Auth del creador | **Auth.js (NextAuth) con Google** |
| Real-time | **No** en el MVP — refresh manual / al cerrar la sesión |

---

## Requisitos funcionales del MVP

1. **Auth del creador**: login con Google (Auth.js). Los invitados NO se registran.
2. **Crear sesión**: nombre, descripción opcional. Genera un `slug` único usable en URL pública.
3. **Agregar películas a la sesión** (solo creador):
   - Buscador con autocomplete contra TMDB (`/search/movie`).
   - Al elegir un resultado se snapshotean a la DB los datos relevantes (TMDB id, título, año, póster, sinopsis, rating).
   - El creador puede quitar películas mientras la sesión esté abierta.
4. **Compartir link público**: `/s/[slug]`. El creador copia y lo manda al grupo.
5. **Página del invitado** (`/s/[slug]`):
   - Pide un alias la primera vez. Se guarda en cookie + en DB como participante de esa sesión.
   - Lista todas las películas con poster, año, sinopsis corta.
   - Cada película tiene 3 botones: **Sí / Tal vez / No**.
   - El invitado puede cambiar su voto mientras la sesión esté abierta.
6. **Cerrar sesión** (solo el creador):
   - Bloquea nuevos votos.
   - Muestra el **top 3**: ranking por puntaje (Sí = 2, Tal vez = 1, No = 0), desempate por cantidad de "Sí".
7. **Dashboard del creador**: listado de sus sesiones (abiertas / cerradas) con link rápido.

**Fuera del scope del MVP** (para no descarrilar):
- Real-time / live updates.
- Que los invitados sugieran películas.
- Comentarios o reviews.
- Notificaciones por email.
- "Película vista" / historial post-juntada.
- Mobile app / PWA.

---

## Stack y arquitectura

- **Framework**: Next.js 16 App Router. Server Components por default; `'use client'` solo donde haya interactividad (búsqueda autocompletada, botones de voto).
- **DB**: Neon Postgres (Marketplace de Vercel). Las env vars (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`) las provisiona la integración.
- **ORM**: **Prisma** — schema declarativo, migraciones con `prisma migrate`, tipos generados, excelente DX. En Vercel + Neon conviene usar el **Prisma Accelerate / Data Proxy** o el driver `@prisma/adapter-neon` para evitar agotar conexiones en Functions serverless.
- **Auth**: Auth.js v5 con Google provider. Adapter de **Prisma** (`@auth/prisma-adapter`) para persistir sesiones en Postgres.
- **Validación**: Zod para inputs de Server Actions / route handlers.
- **UI**: Tailwind v4 + shadcn/ui (solo los componentes que vayas necesitando).
- **API de películas**: TMDB v3, key como env var (`TMDB_API_KEY`). Las llamadas se hacen **server-side** para no exponer la key.
- **Mutaciones**: Server Actions (no API routes salvo donde necesites GET cacheado o webhooks).
- **Deploy**: Vercel. Fluid Compute (default).

### IMPORTANTE sobre Next.js 16

Estás en Next.js 16 (no 14/15). Esto trae cambios que afectan el plan:
- **`middleware.ts` se llama `proxy.ts`** ahora. Solo lo vas a necesitar si querés gates de auth a nivel de ruta — para el MVP probablemente no haga falta.
- **Cache Components** (`use cache`, `cacheLife`, `cacheTag`) reemplazan `unstable_cache`. Útiles para cachear resultados de TMDB.
- `params` y `searchParams` en Server Components son **async** — siempre `await`-eados.
- Antes de tocar APIs específicas, leer `node_modules/next/dist/docs/01-app/` (lo dice el AGENTS.md del repo).

---

## Modelo de datos (Prisma schema, simplificado)

```prisma
// Tablas estándar de Auth.js (User, Account, Session, VerificationToken)
// se generan a partir del Prisma adapter de Auth.js — no las repito acá.

model Club {
  id          String   @id @default(cuid())
  slug        String   @unique
  creatorId   String
  creator     User     @relation(fields: [creatorId], references: [id])
  name        String
  description String?
  status      ClubStatus @default(OPEN)
  closedAt    DateTime?
  createdAt   DateTime @default(now())
  movies      Movie[]
  participants Participant[]
}

enum ClubStatus { OPEN  CLOSED }

model Movie {
  id          String   @id @default(cuid())
  clubId      String
  club        Club     @relation(fields: [clubId], references: [id], onDelete: Cascade)
  tmdbId      Int
  title       String
  year        Int?
  posterPath  String?
  overview    String?
  tmdbRating  Float?
  addedAt     DateTime @default(now())
  votes       Vote[]
  @@unique([clubId, tmdbId])  // evita duplicar la misma peli en un club
}

model Participant {
  id          String   @id @default(cuid())
  clubId      String
  club        Club     @relation(fields: [clubId], references: [id], onDelete: Cascade)
  alias       String
  cookieToken String   @unique
  joinedAt    DateTime @default(now())
  votes       Vote[]
  @@unique([clubId, alias])   // alias único dentro del club
}

model Vote {
  id            String   @id @default(cuid())
  movieId       String
  movie         Movie    @relation(fields: [movieId], references: [id], onDelete: Cascade)
  participantId String
  participant   Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)
  value         VoteValue
  updatedAt     DateTime @updatedAt
  @@unique([movieId, participantId])  // un voto por persona por peli
}

enum VoteValue { YES  MAYBE  NO }
```

---

## Dificultades / riesgos a tener en mente

1. **Identidad del invitado sin login**:
   - Usar cookie HTTP-only firmada con un `cookie_token` que apunte al `participants.id`. Si el invitado borra cookies, vuelve a aparecer como otro participante (asumible en MVP).
   - Validar que el alias sea único *dentro del club* para evitar confusión visual.

2. **Rate limiting de TMDB**:
   - TMDB permite ~50 req/seg pero conviene **cachear** búsquedas y detalles. Usar `'use cache'` + `cacheTag` por query.
   - El autocomplete del buscador debe tener **debounce** (≥300ms) en cliente para no quemar requests.

3. **Exposición de la API key**:
   - Todas las llamadas a TMDB van server-side. Nunca exponer `TMDB_API_KEY` al cliente.

4. **Abuso del link público**:
   - Cualquiera con el link puede votar. Para el MVP es aceptable, pero conviene:
     - Limitar cantidad de participantes por club (ej. 50).
     - Rate-limit de votos por IP (Upstash Redis o `@vercel/firewall` rules) — se puede dejar para v1.1.

5. **Slug colisión / adivinabilidad**:
   - Generar slugs de ~10 chars con `nanoid` (no secuenciales). Suficiente entropía para que no se adivinen.

6. **Cambio de votos vs cierre**:
   - Una vez `status='closed'`, el endpoint de votar debe rechazar. Validar en el server action.

7. **Cálculo del Top 3**:
   - Hacerlo en SQL con un `GROUP BY movie_id` sumando `CASE WHEN value='yes' THEN 2 WHEN value='maybe' THEN 1 ELSE 0 END`. No traer todo a Node.

8. **Snapshot de películas vs referencia**:
   - Snapshotear título/póster/sinopsis a `movies` (no solo guardar `tmdb_id`) para que el resultado sea estable aunque cambien los datos en TMDB y para mostrar sin un fetch externo.

9. **Onboarding del invitado**:
   - La primera carga de `/s/[slug]` debe ser una sola pantalla: alias → entrar → ver películas. No meter más fricción.

10. **Errores silenciosos en producción**:
    - Configurar logs en Vercel desde el día 1. No hace falta Sentry en MVP, pero loguear errores de TMDB y de DB.

11. **Cold start de Neon**:
    - Neon free duerme la DB cuando no se usa. Primer request post-idle puede tardar ~1s. Aceptable en MVP.

---

## Roadmap por tasks (incremental, mergeable después de cada hito)

Cada hito deja la app en un estado **demoable y deployable**. Si parás después de cualquiera, lo anterior sigue funcionando.

### Hito 0 — Cimientos (medio día)
- [ ] Crear proyecto en Vercel, linkear repo.
- [ ] Instalar Neon via Marketplace → autoprovisiona `DATABASE_URL`.
- [ ] Sacar API key de TMDB → guardar como `TMDB_API_KEY` en `vercel env`.
- [ ] Instalar Prisma: `prisma`, `@prisma/client`, `@prisma/adapter-neon`, `@neondatabase/serverless`. `npx prisma init`. Configurar `prisma/schema.prisma` con `previewFeatures = ["driverAdapters"]`.
- [ ] Crear `lib/db.ts` con un cliente Prisma singleton que use el adapter de Neon (clave en Vercel Functions para no agotar conexiones).
- [ ] Instalar Zod, nanoid.
- [ ] Confirmar `pnpm dev` + deploy preview en Vercel.

### Hito 1 — Auth del creador (medio día)
- [ ] Instalar `next-auth@beta` (v5) + `@auth/prisma-adapter`.
- [ ] Configurar Google OAuth (consola de Google Cloud: crear credenciales OAuth con redirect a `/api/auth/callback/google`).
- [ ] Modelos User/Account/Session/VerificationToken en `schema.prisma` + `prisma migrate dev --name init_auth`.
- [ ] Páginas `/login` y `/dashboard` (esta última protegida).
- [ ] Verificar: podés loguearte con Google y ver `/dashboard` con tu email.

### Hito 2 — Crear sesión (1 día)
- [ ] Modelo `Club` + `prisma migrate dev --name add_clubs`.
- [ ] Form en `/dashboard/new` con server action `createClub` (Zod-validated). Genera `slug` con `nanoid(10)`.
- [ ] Listado de "Mis sesiones" en `/dashboard`.
- [ ] Página `/clubs/[slug]/manage` (solo creador): muestra info del club, todavía sin películas.
- [ ] Verificar: creás un club, te aparece en el dashboard, accedés a `/manage`.

### Hito 3 — Buscar y agregar películas (1-2 días)
- [ ] Wrapper de TMDB en `lib/tmdb.ts`: `searchMovies(query)`, `getMovieDetails(id)`. Marcar con `'use cache'` + `cacheTag`.
- [ ] Modelo `Movie` + migración.
- [ ] Componente cliente `MovieSearch` con debounce → llama un server action que hace `searchMovies`. Render de resultados con poster.
- [ ] Server action `addMovieToClub(clubId, tmdbId)` — fetchea detalles y los persiste (UNIQUE constraint evita duplicados).
- [ ] Server action `removeMovie`.
- [ ] UI en `/clubs/[slug]/manage` con buscador y grid de películas agregadas.
- [ ] Verificar: buscás "Pulp Fiction", la agregás, aparece con poster. Repetir agregado falla silenciosamente. Quitarla funciona.

### Hito 4 — Página pública del invitado + alias (1 día)
- [ ] Página `/s/[slug]` (pública, sin auth).
- [ ] Modelo `Participant` + migración.
- [ ] Si no hay cookie `pflix_pid_<slug>`: render de modal/form pidiendo alias → server action `joinClub(slug, alias)` valida unicidad, crea participant, setea cookie HTTP-only.
- [ ] Si hay cookie: render directo de la lista de películas (sin botones de voto todavía).
- [ ] Verificar: abrís el link en incógnito, ponés alias, ves la lista.

### Hito 5 — Votación (1 día)
- [ ] Modelo `Vote` + migración.
- [ ] Server action `castVote(movieId, value)` — usa cookie para resolver `participantId`, upsert sobre `UNIQUE (movie_id, participant_id)`, rechaza si club está cerrado.
- [ ] En `/s/[slug]`: por cada película, 3 botones (Sí / Tal vez / No) que reflejan el voto actual del participante. Click muta y re-renderiza la card.
- [ ] Verificar: votás, recargás la página, el voto persiste. Cambiás de voto, persiste. Otro participante en otro navegador vota independiente.

### Hito 6 — Cerrar sesión y top 3 (medio día)
- [ ] Server action `closeClub(clubId)` — setea `status='closed'`, `closed_at`.
- [ ] Página `/s/[slug]/results` (visible cuando el club está cerrado): query SQL agregada con el ranking. Render del podio top 3 + tabla completa con conteos.
- [ ] En `/s/[slug]`, si `status='closed'` → redirect a `/results`. Botones de voto deshabilitados.
- [ ] Botón "Cerrar votación" en `/manage`.
- [ ] Verificar: cerrás el club, los invitados ven el top 3, no pueden seguir votando.

### Hito 7 — Pulido para usar con amigos de verdad (1 día)
- [ ] Estados vacíos (sin sesiones, sin películas, sin votos).
- [ ] Mensajes de error legibles.
- [ ] Mobile-friendly (las votaciones se van a hacer en celular).
- [ ] Meta tags / OG image para que el link se vea bien al compartirlo en WhatsApp.
- [ ] Deploy a producción + dominio si querés.

### Total estimado: ~7-9 días-persona de trabajo enfocado.

---

## Verificación end-to-end del MVP

Flujo a probar manualmente antes de declarar el MVP listo:

1. Loguearte con Google en producción.
2. Crear un club "Viernes de Tarantino".
3. Agregar 5 películas vía el buscador (incluir una en español para validar locale de TMDB).
4. Copiar el link `/s/<slug>` y abrirlo en 3 navegadores distintos (incógnito en otro perfil, etc.).
5. Cada "invitado" pone un alias distinto y vota diferente.
6. Verificar en la DB que los votos se persistieron correctamente (`select * from votes`).
7. Cerrar la votación desde el dashboard.
8. Confirmar que los invitados ven el top 3 y no pueden seguir votando.
9. Probar abrir el link después de cerrado en un browser nuevo → debe redirigir a `/results` directamente.

---

## Archivos críticos a crear (referencia rápida)

- `prisma/schema.prisma` — modelos y enums
- `prisma/migrations/` — carpeta generada por `prisma migrate`
- `lib/db.ts` — cliente Prisma singleton con `@prisma/adapter-neon`
- `lib/tmdb.ts` — wrapper de TMDB con caching
- `lib/auth.ts` — config de Auth.js v5 + `PrismaAdapter`
- `app/dashboard/page.tsx`, `app/dashboard/new/page.tsx`
- `app/clubs/[slug]/manage/page.tsx`
- `app/s/[slug]/page.tsx`, `app/s/[slug]/results/page.tsx`
- `app/actions/clubs.ts`, `app/actions/movies.ts`, `app/actions/votes.ts` — server actions

Antes de codear cualquier API específica de Next 16, leer la guía relevante en `node_modules/next/dist/docs/01-app/` (lo pide el `AGENTS.md` del repo).
