<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/54088f75-aeab-47ef-aff0-3ed53c6ba118

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Probar cambios en local antes de desplegar en Netlify (Windows)

Correr la app en tu PC no consume créditos de Netlify.

**Una sola vez:**
1. Instalar Node.js LTS desde https://nodejs.org y Git desde https://git-scm.com.
2. Clonar el repo: `git clone https://github.com/H6rn1M4x1/FSR-WorkSpace.git` y entrar a la carpeta.
3. Copiar `.env.example` como `.env` y completar las claves (las mismas que están en Netlify, en Site configuration > Environment variables).
4. `npm install`

**Cada vez que quieras ver cambios:**
1. `git fetch` y `git checkout <rama>` (la rama donde se hizo el cambio), luego `git pull`.
2. `npm run dev`
3. Abrir http://localhost:3000. Al guardar un archivo la página se recarga sola.

Cuando el cambio esté bien, recién ahí se mergea a `main` (un solo build en Netlify).
