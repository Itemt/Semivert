/**
 * semivert-embed.js
 * Script de integración e incrustación de Semivert para cualquier sitio web o HTML.
 * Permite incrustar la aplicación vía iframe responsive, modal flotante o lanzador.
 */
(function (global) {
  'use strict';

  // Detectar la URL base del script
  let baseUrl = '';
  const currentScript = document.currentScript;
  if (currentScript && currentScript.src) {
    baseUrl = currentScript.src.substring(0, currentScript.src.lastIndexOf('/') + 1);
  } else {
    // Fallback relativo si se incluye inline
    baseUrl = './';
  }

  const Semivert = {
    version: '1.7.0',
    appUrl: baseUrl + 'index.html',

    /**
     * Incrusta Semivert dentro de un contenedor HTML existente.
     * @param {string|HTMLElement} target - Selector CSS o elemento DOM contenedor.
     * @param {Object} options - Opciones de configuración (width, height, borderRadius, etc.)
     */
    embed: function (target, options = {}) {
      const container = typeof target === 'string' ? document.querySelector(target) : target;
      if (!container) {
        console.error('[Semivert Embed] Contenedor no encontrado:', target);
        return null;
      }

      const width = options.width || '100%';
      const height = options.height || '780px';
      const borderRadius = options.borderRadius || '16px';
      const boxShadow = options.boxShadow || '0 12px 36px rgba(0,0,0,0.18)';
      const allowCamera = options.allowCamera !== false;

      // Crear envoltorio responsivo
      const wrapper = document.createElement('div');
      wrapper.className = 'semivert-embed-wrapper';
      wrapper.style.cssText = `
        position: relative;
        width: ${width};
        height: ${height};
        max-width: 100%;
        border-radius: ${borderRadius};
        overflow: hidden;
        box-shadow: ${boxShadow};
        background: #0f2419;
      `;

      const iframe = document.createElement('iframe');
      iframe.src = options.src || this.appUrl;
      iframe.title = 'Semivert - Las Cuatro Semillas Verdes';
      iframe.style.cssText = 'width: 100%; height: 100%; border: none; display: block;';
      if (allowCamera) {
        iframe.allow = 'camera; microphone; autoplay';
      }
      iframe.loading = 'lazy';

      wrapper.appendChild(iframe);
      container.innerHTML = '';
      container.appendChild(wrapper);

      return wrapper;
    },

    /**
     * Abre Semivert en una ventana modal emergente con backdrop difuminado.
     * @param {Object} options - Opciones de la modal.
     */
    openModal: function (options = {}) {
      let modal = document.getElementById('semivert-modal-overlay');
      if (modal) {
        modal.style.display = 'flex';
        return modal;
      }

      modal = document.createElement('div');
      modal.id = 'semivert-modal-overlay';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(8, 20, 13, 0.85);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        padding: 16px;
        box-sizing: border-box;
        animation: semivertFadeIn 0.25s ease-out;
      `;

      const modalBox = document.createElement('div');
      modalBox.style.cssText = `
        position: relative;
        width: 100%;
        max-width: ${options.maxWidth || '1100px'};
        height: 90vh;
        max-height: 850px;
        background: #0f2419;
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 25px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(76, 175, 80, 0.3);
        display: flex;
        flex-direction: column;
      `;

      // Barra superior con botón de cierre
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 18px;
        background: rgba(18, 48, 30, 0.95);
        border-bottom: 1px solid rgba(76, 175, 80, 0.25);
        color: #e8f5e9;
        font-family: system-ui, -apple-system, sans-serif;
      `;
      header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px;">
          <span>🌱</span> <span>Semivert — Las Cuatro Semillas Verdes</span>
        </div>
        <button id="semivert-modal-close" style="
          background: rgba(255,255,255,0.1);
          border: none;
          color: #e8f5e9;
          font-size: 18px;
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        " title="Cerrar (Esc)">✕</button>
      `;

      const iframe = document.createElement('iframe');
      iframe.src = options.src || this.appUrl;
      iframe.title = 'Semivert Modal';
      iframe.style.cssText = 'width: 100%; flex: 1; border: none;';
      iframe.allow = 'camera; microphone; autoplay';

      modalBox.appendChild(header);
      modalBox.appendChild(iframe);
      modal.appendChild(modalBox);
      document.body.appendChild(modal);

      // Eventos de cierre
      const cerrar = () => {
        modal.style.display = 'none';
      };

      header.querySelector('#semivert-modal-close').onclick = cerrar;
      modal.onclick = (e) => {
        if (e.target === modal) cerrar();
      };

      document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape' && modal.style.display !== 'none') {
          cerrar();
        }
      });

      return modal;
    },

    /**
     * Añade un botón flotante en la esquina inferior derecha para abrir Semivert.
     * @param {Object} options - Configuración del botón.
     */
    addFloatingButton: function (options = {}) {
      if (document.getElementById('semivert-floating-btn')) return;

      const btn = document.createElement('button');
      btn.id = 'semivert-floating-btn';
      btn.innerHTML = options.text || '🌱 Jugar Semivert';
      btn.style.cssText = `
        position: fixed;
        bottom: ${options.bottom || '24px'};
        right: ${options.right || '24px'};
        background: linear-gradient(135deg, #2e7d32, #43a047);
        color: #ffffff;
        border: none;
        padding: 12px 22px;
        font-size: 15px;
        font-weight: 700;
        font-family: system-ui, -apple-system, sans-serif;
        border-radius: 50px;
        box-shadow: 0 8px 24px rgba(46, 125, 50, 0.4);
        cursor: pointer;
        z-index: 99998;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: transform 0.2s, box-shadow 0.2s;
      `;

      btn.onmouseenter = () => {
        btn.style.transform = 'translateY(-3px) scale(1.03)';
        btn.style.boxShadow = '0 12px 28px rgba(46, 125, 50, 0.55)';
      };
      btn.onmouseleave = () => {
        btn.style.transform = 'translateY(0) scale(1)';
        btn.style.boxShadow = '0 8px 24px rgba(46, 125, 50, 0.4)';
      };

      btn.onclick = () => this.openModal(options);
      document.body.appendChild(btn);
    },

    /**
     * Auto-inicializa elementos con atributo [data-semivert-embed].
     */
    autoInit: function () {
      const elements = document.querySelectorAll('[data-semivert-embed]');
      elements.forEach((el) => {
        const height = el.getAttribute('data-height') || '780px';
        const width = el.getAttribute('data-width') || '100%';
        this.embed(el, { height, width });
      });

      if (document.querySelector('[data-semivert-launcher]')) {
        this.addFloatingButton();
      }
    }
  };

  // Auto-inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Semivert.autoInit());
  } else {
    Semivert.autoInit();
  }

  // Estilos de animación
  const style = document.createElement('style');
  style.textContent = `
    @keyframes semivertFadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);

  global.Semivert = Semivert;
})(typeof window !== 'undefined' ? window : this);
