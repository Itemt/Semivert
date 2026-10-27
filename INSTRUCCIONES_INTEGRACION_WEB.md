# 🌱 Semivert — Guía Rápida de Importación e Integración Web

Este documento detalla cómo tomar el clon de **Semivert** y publicarlo o incrustarlo inmediatamente en cualquier sitio web o archivo HTML existente.

---

## 📁 Estructura del Proyecto

En el directorio `/Users/cris/.gemini/antigravity-ide/scratch/semivert` encontrarás:

```text
semivert/
├── repo/                     # Clon completo del repositorio original de GitHub
├── semivert-web/             # Paquete estático 100% autónomo listo para desplegar
│   ├── index.html            # Aplicación web completa de Semivert
│   ├── styles.css            # Estilos, temas (oscuro/claro) y animaciones
│   ├── favicon.png           # Ícono de la aplicación
│   ├── semivert-embed.js     # Script de ayuda para incrustar en cualquier web
│   ├── pictures/             # Imágenes y sprites de los personajes organizados
│   │   ├── camila/
│   │   ├── giohan/
│   │   ├── juliana/
│   │   └── mariasofia/
│   └── js/                   # Arquitectura MVC modular del cliente
│       ├── app.js
│       ├── config.js
│       ├── controllers/
│       ├── models/
│       └── views/
├── ejemplo-embed.html        # Página demo con previsualización en vivo, simulador de orientación y ejemplos
└── INSTRUCCIONES_INTEGRACION_WEB.md  # Esta guía
```

---

## 📱 Comportamiento Responsive Adaptativo (Dual-Mode)

La aplicación implementa un sistema responsive avanzado:

1. **Mobile en Orientación Horizontal (Landscape):**
   - **Vista idéntica a escritorio:** Se ancla la barra lateral izquierda fija (sidebar plegable/expandible), la barra inferior móvil desaparece por completo y el contenido aprovecha todo el ancho disponible.
   - Ideal para jugar con el teléfono girado, tabletas o pantallas panorámicas.

2. **Mobile en Orientación Vertical (Portrait):**
   - **Adaptación móvil ergonómica al 100%:**
     - Barra de navegación inferior móvil accesible con el pulgar (`bottom-nav` fija con soporte para safe areas de iPhone y Android).
     - Menú lateral como cajón deslizante off-canvas con fondo translúcido (overlay).
     - Modales adaptados como paneles inferiores (*bottom sheets*) con esquinas redondeadas superiores y desplazamiento suave.
     - Grillas en una sola columna para misiones y consejos, tarjetas optimizadas, botones de acción táctiles de mínimo 48px y tipografía legible sin desbordamientos.

---

## 🚀 Método 1: Incrustar mediante `<iframe>` (El más rápido y recomendado)

Copia la carpeta `semivert-web` dentro de la carpeta pública de tu sitio web (o súbela a tu servidor) y añade el siguiente código en el HTML de tu página:

```html
<!-- Contenedor responsive para Semivert -->
<div style="position: relative; width: 100%; max-width: 1200px; height: 850px; margin: 0 auto; border-radius: 18px; overflow: hidden; box-shadow: 0 15px 40px rgba(0,0,0,0.25);">
  <iframe 
    src="./semivert-web/index.html" 
    style="width: 100%; height: 100%; border: none;" 
    allow="camera; microphone; autoplay" 
    loading="lazy"
    title="Semivert - Las Cuatro Semillas Verdes">
  </iframe>
</div>
```

> **Ventajas:**
> - Aislamiento total: No hay conflicto de CSS ni colisiones con scripts de tu web (Bootstrap, Tailwind, WordPress, etc.).
> - Soporte para cámara y biometría facial mediante el atributo `allow="camera"`.

---

## ⚡ Método 2: Integración con `semivert-embed.js`

Si prefieres usar un script ligero que arme la integración automáticamente:

1. Agrega el script en el `<head>` o antes de cerrar el `<body>`:
   ```html
   <script src="./semivert-web/semivert-embed.js"></script>
   ```

2. Inserta el contenedor en donde desees que aparezca:
   ```html
   <div data-semivert-embed data-height="800px" data-width="100%"></div>
   ```

---

## 🪄 Método 3: Modal Emergente o Botón Flotante

Ideal si deseas que los visitantes de tu web jueguen en una ventana emergente sin abandonar la lectura de tu página:

```html
<script src="./semivert-web/semivert-embed.js"></script>

<!-- Botón manual en tu menú o contenido -->
<button onclick="Semivert.openModal()" style="padding: 12px 24px; background: #2e7d32; color: #fff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
  🌱 Jugar Semivert
</button>

<!-- O botón flotante permanente en la esquina inferior derecha -->
<script>
  Semivert.addFloatingButton({ text: '🌱 Jugar Semivert' });
</script>
```

---

## 🌐 Despliegue en la Nube (Hosting Estático Gratuito)

La carpeta `semivert-web` es 100% estática y puede desplegarse en segundos en:

- **Vercel / Netlify:** Arrastra y suelta la carpeta `semivert-web` directamente en el dashboard de Netlify Drop o ejecuta `npx vercel` dentro de `semivert-web`.
- **GitHub Pages:** Sube los archivos a una rama `gh-pages` o en la carpeta `docs/`.
- **Hosting Compartido (cPanel / Apache / Nginx):** Sube el contenido de `semivert-web` a `public_html/semivert/` y estará disponible en `https://tudominio.com/semivert/`.

---

## ⚙️ Conexión con Backend Opcional

La aplicación cuenta con tolerancia a fallos:
- Si **no hay backend activo**, funciona inmediatamente en **Modo Local / Demo Interactivo** guardando progreso, misiones y puntos en `localStorage`.
- Si tienes el backend FastAPI de Semivert levantado en otro dominio o servidor, puedes configurarlo agregando una variable global antes de cargar la app:
  ```html
  <script>
    window.SEMIVERT_API_BASE = 'https://api.tu-servidor.com';
  </script>
  ```
