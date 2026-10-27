/**
 * appController.js
 * Controller: Coopera entre el StateModel (Model) y las diversas Vistas.
 */

export class AppController {
  constructor(model, views) {
    this.model = model;
    this.mainView = views.mainView;
    this.loginView = views.loginView;
    this.homeView = views.homeView;
    this.treeView = views.treeView;
    this.mapView = views.mapView;
    this.missionView = views.missionView;
    this.academiaView = views.academiaView;
    this.rankingView = views.rankingView;
    this.perfilView = views.perfilView;

    this.animFrameArbol = null;
  }

  inicializar() {
    // 1. Cargar tema guardado
    const temaGuardado = localStorage.getItem('semiverd_tema') || 'dark';
    this.mainView.aplicarTema(temaGuardado);

    // 2. Crear partículas flotantes
    this.mainView.crearParticulas('particles-login', 15);

    // 3. Vincular manejadores de eventos
    this.vincularEventos();

    // 4. Iniciar bucle de animación para el árbol
    this.iniciarAnimacionArbol();

    // 5. Verificar sesión existente
    const sesionActiva = this.model.cargarSesionGuardada();
    if (sesionActiva) {
      if (this.model.isDemo()) {
        this.entrarApp();
      } else {
        this.model.verificarToken().then(valido => {
          if (valido) {
            this.entrarApp();
          } else {
            this.mainView.mostrarPantalla('login');
            this.loginView.mostrarTab('facial');
            this.mainView.toast('Tu sesión ha expirado. Por favor ingresa de nuevo. 🌿', 'error');
          }
        }).catch(() => {
          this.mainView.mostrarPantalla('login');
          this.loginView.mostrarTab('facial');
        });
      }
    } else {
      this.mainView.mostrarPantalla('login');
      this.loginView.mostrarTab('facial');
    }

    // 6. Ocultar y remover el Splash Screen tras 2.5 segundos
    setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      if (splash) {
        splash.classList.add('fadeout');
        setTimeout(() => {
          splash.remove();
        }, 600);
      }
    }, 2500);
  }

  vincularEventos() {
    // Manejo de pestañas de login
    document.getElementById('tab-facial').addEventListener('click', () => this.loginView.mostrarTab('facial'));
    document.getElementById('tab-correo').addEventListener('click', () => this.loginView.mostrarTab('correo'));
    document.getElementById('tab-registro').addEventListener('click', () => this.loginView.mostrarTab('registro'));

    // Botones de acción de login
    document.querySelector('#tab-content-correo button').addEventListener('click', () => this.ejecutarLoginCorreo());
    document.querySelector('#tab-content-registro button').addEventListener('click', () => this.ejecutarRegistro());
    document.querySelector('.btn-demo').addEventListener('click', () => this.ejecutarDemo());

    // Cámara y facial login
    this.loginView.btnActivar.addEventListener('click', () => this.activarCamara());
    this.loginView.btnCapturar.addEventListener('click', () => this.capturarFoto());
    this.loginView.btnFacialLogin.addEventListener('click', () => this.ejecutarLoginFacial());

    // Navegación Sidebar y Bottom Nav
    const routes = ['inicio', 'arbol', 'camino', 'misiones', 'academia', 'ranking', 'perfil'];
    routes.forEach(route => {
      const navBtn = document.getElementById(`nav-${route}`);
      if (navBtn) navBtn.addEventListener('click', () => this.irA(route));
      const bnavBtn = document.getElementById(`bnav-${route}`);
      if (bnavBtn) bnavBtn.addEventListener('click', () => this.irA(route));
    });

    // Control del sidebar (hamburguesa)
    const btnHamb = document.getElementById('btn-hamburguesa');
    if (btnHamb) btnHamb.addEventListener('click', () => this.mainView.toggleSidebar());
    this.mainView.overlay.addEventListener('click', () => this.mainView.cerrarSidebar());

    // Tema claro/oscuro (SIN toast)
    this.mainView.btnToggleTemas.forEach(btn => {
      btn.addEventListener('click', () => this.toggleTema());
    });

    // Avatar dropdown
    const btnAvatar = document.getElementById('btn-avatar');
    if (btnAvatar) {
      btnAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        this.mainView.toggleAvatarDropdown();
      });
    }
    // Cerrar dropdown al hacer click fuera
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#avatar-wrapper')) {
        this.mainView.cerrarAvatarDropdown();
      }
    });
    // Items del dropdown
    const ddPerfil = document.getElementById('dd-ir-perfil');
    if (ddPerfil) ddPerfil.addEventListener('click', () => { this.irA('perfil'); this.mainView.cerrarAvatarDropdown(); });
    const ddFoto = document.getElementById('dd-cambiar-foto');
    if (ddFoto) ddFoto.addEventListener('click', () => { this.abrirSelectorFoto(); this.mainView.cerrarAvatarDropdown(); });
    const ddSalir = document.getElementById('dd-cerrar-sesion');
    if (ddSalir) ddSalir.addEventListener('click', () => { this.cerrarSesion(); this.mainView.cerrarAvatarDropdown(); });
    const ddServidor = document.getElementById('dd-config-servidor');
    if (ddServidor) ddServidor.addEventListener('click', () => { this.abrirModalServidor(); this.mainView.cerrarAvatarDropdown(); });

    // Configuración de Servidor
    const btnPerfilServidor = document.getElementById('btn-perfil-config-servidor');
    if (btnPerfilServidor) btnPerfilServidor.addEventListener('click', () => this.abrirModalServidor());
    const btnCerrarServidor = document.getElementById('btn-cerrar-modal-servidor');
    if (btnCerrarServidor) btnCerrarServidor.addEventListener('click', () => this.cerrarModalServidor());
    const btnGuardarServidor = document.getElementById('btn-guardar-servidor');
    if (btnGuardarServidor) btnGuardarServidor.addEventListener('click', () => this.guardarConfiguracionServidor());
    const btnResetearServidor = document.getElementById('btn-resetear-servidor');
    if (btnResetearServidor) btnResetearServidor.addEventListener('click', () => this.resetearAModoAutonomo());

    // Cerrar sesión
    document.querySelector('.sidebar-logout').addEventListener('click', () => this.cerrarSesion());
    document.querySelector('.perfil-card .btn-danger').addEventListener('click', () => this.cerrarSesion());

    // Filtros de la academia
    document.querySelectorAll('.filtros-categoria .filtro-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        let filterCat = null;
        if (e.target.textContent.includes('Jardín')) filterCat = 'jardinería';
        else if (e.target.textContent.includes('Agua')) filterCat = 'agua';
        else if (e.target.textContent.includes('Energía')) filterCat = 'energia';
        else if (e.target.textContent.includes('Reciclaje')) filterCat = 'reciclaje';
        this.academiaView.actualizarFiltrosActivos(e.target);
        this.academiaView.renderTips(this.model.tips, filterCat);
      });
    });

    // Modal cerrar y Escape
    document.querySelector('.modal-cerrar').addEventListener('click', () => this.missionView.cerrarModal());
    document.querySelector('.modal-backdrop').addEventListener('click', () => this.missionView.cerrarModal());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.missionView.cerrarModal();
        this.academiaView.cerrarModal();
      }
    });

    // Perfil: editar nombre
    const btnEditarNombre = document.getElementById('btn-editar-nombre');
    if (btnEditarNombre) btnEditarNombre.addEventListener('click', () => this.abrirEditorNombre());
    const btnGuardarNombre = document.getElementById('btn-guardar-nombre');
    if (btnGuardarNombre) btnGuardarNombre.addEventListener('click', () => this.guardarNombrePerfil());
    const btnCancelarNombre = document.getElementById('btn-cancelar-nombre');
    if (btnCancelarNombre) btnCancelarNombre.addEventListener('click', () => this.cerrarEditorNombre());

    // Perfil: cambiar foto
    const btnCambiarFoto = document.getElementById('btn-cambiar-foto-perfil');
    if (btnCambiarFoto) btnCambiarFoto.addEventListener('click', () => this.abrirSelectorFoto());
    const perfilAvatarDisplay = document.getElementById('perfil-avatar-display');
    if (perfilAvatarDisplay) perfilAvatarDisplay.addEventListener('click', () => this.abrirSelectorFoto());
    const fotoInput = document.getElementById('perfil-foto-input');
    if (fotoInput) fotoInput.addEventListener('change', (e) => this.procesarFotoSeleccionada(e));
  }

  async ejecutarLoginCorreo() {
    const { correo, password } = this.loginView.getCredentialsLogin();
    if (!correo || !password) {
      this.loginView.mostrarMensaje('Por favor, completa todos los campos 🌱', 'error');
      return;
    }

    this.loginView.mostrarMensaje('Verificando credenciales...', '');
    try {
      await this.model.loginCorreo(correo, password);
      this.entrarApp();
    } catch (err) {
      if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Load failed'))) {
        this.loginView.mostrarMensaje('Modo interactivo local activado. ¡Bienvenido Guardián! 🌿', 'exito');
        this.model.activarDemo();
        this.model.usuario.correo = correo;
        this.model.guardarSesion();
        setTimeout(() => this.entrarApp(), 800);
        return;
      }

      // Check if error is due to email not registered (404)
      const noRegistrado = err.message && (
        err.message.includes('no está registrado') || 
        err.message.includes('registrarse') || 
        err.message.includes('404')
      );

      if (noRegistrado) {
        // Check camera status
        let hasCamera = false;
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          hasCamera = devices.some(device => device.kind === 'videoinput');
        } catch (e) {
          hasCamera = false;
        }

        if (!hasCamera) {
          this.loginView.mostrarMensaje('No se detectó cámara en este dispositivo y este correo no está registrado. Por favor, regístrate. 🌿', 'error');
          const regCorreoEl = document.getElementById('reg-correo');
          if (regCorreoEl) regCorreoEl.value = correo;
          setTimeout(() => {
            this.loginView.mostrarTab('registro');
          }, 3000);
          return;
        } else {
          this.loginView.mostrarMensaje(err.message || 'Este correo no está registrado.', 'error');
          const regCorreoEl = document.getElementById('reg-correo');
          if (regCorreoEl) regCorreoEl.value = correo;
          setTimeout(() => {
            this.loginView.mostrarTab('registro');
          }, 2000);
          return;
        }
      }

      this.loginView.mostrarMensaje(err.message || 'Error al iniciar sesión. Verifica tus datos.', 'error');
    }
  }

  async ejecutarRegistro() {
    const { nombre, apodo, correo, password } = this.loginView.getCredentialsRegistro();
    if (!nombre || !correo || !password) {
      this.loginView.mostrarMensaje('Por favor, completa nombre, correo y contraseña 🌱', 'error');
      return;
    }

    if (password.length < 6) {
      this.loginView.mostrarMensaje('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    this.loginView.mostrarMensaje('Creando tu cuenta de guardián...', '');
    try {
      await this.model.registrarUsuario(nombre, apodo, correo, password);
      this.loginView.mostrarMensaje('¡Bienvenido a las Semillas Verdes! 🌱', 'exito');
      setTimeout(() => this.entrarApp(), 1000);
    } catch (err) {
      if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Load failed'))) {
        this.loginView.mostrarMensaje('¡Guardián creado en modo local! Bienvenido a las Semillas Verdes 🌱', 'exito');
        this.model.activarDemo();
        this.model.usuario.nombre = nombre;
        this.model.usuario.apodo = apodo || nombre;
        this.model.usuario.correo = correo;
        this.model.guardarSesion();
        setTimeout(() => this.entrarApp(), 800);
        return;
      }
      this.loginView.mostrarMensaje(err.message || 'Error al crear la cuenta. Inténtalo de nuevo.', 'error');
    }
  }

  ejecutarDemo() {
    this.model.activarDemo();
    this.entrarApp();
  }

  async activarCamara() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false
      });

      this.model.streamCamara = stream;
      this.loginView.iniciarStreamVideo(stream);
      this.loginView.mostrarMensaje('¡Cámara activa! Centra tu cara en el círculo y captura 📷', 'exito');
    } catch (err) {
      console.warn('Error cámara:', err);
      // Check if they typed a correo in facial login tab
      const { correo } = this.loginView.getCredentialsFacial();
      if (correo) {
        this.loginView.mostrarMensaje('No se pudo acceder a la cámara. Verificando estado de tu cuenta... 🔍', 'error');
        try {
          // Attempt login with a dummy password to check registration status
          await this.model.loginCorreo(correo, 'check_registration_status_dummy_pwd');
        } catch (checkErr) {
          const noRegistrado = checkErr.message && (
            checkErr.message.includes('no está registrado') || 
            checkErr.message.includes('registrarse') || 
            checkErr.message.includes('404')
          );
          if (noRegistrado) {
            this.loginView.mostrarMensaje('No tienes cámara en este dispositivo y no te has registrado. Redirigiendo a registro... 🌿', 'error');
            const regCorreoEl = document.getElementById('reg-correo');
            if (regCorreoEl) regCorreoEl.value = correo;
            setTimeout(() => {
              this.loginView.mostrarTab('registro');
            }, 3000);
          } else {
            this.loginView.mostrarMensaje('No se detectó cámara, pero tu cuenta ya existe. Redirigiendo a ingreso con contraseña... 🔐', 'error');
            const loginCorreoEl = document.getElementById('login-correo');
            if (loginCorreoEl) loginCorreoEl.value = correo;
            setTimeout(() => {
              this.loginView.mostrarTab('correo');
            }, 3000);
          }
        }
      } else {
        this.loginView.mostrarMensaje('No se pudo acceder a la cámara. Verifica los permisos.', 'error');
      }
    }
  }

  capturarFoto() {
    if (this.loginView.btnCapturar.textContent.includes('Nueva foto')) {
      this.model.fotoCapturada = null;
      this.loginView.resetearCamara();
      this.activarCamara();
    } else {
      const fotoUrl = this.loginView.capturarFotoEnCanvas();
      this.model.fotoCapturada = fotoUrl;

      // Detener stream
      if (this.model.streamCamara) {
        this.model.streamCamara.getTracks().forEach(t => t.stop());
        this.model.streamCamara = null;
      }
      this.loginView.mostrarMensaje('¡Foto capturada! Escribe tu correo y entra como guardián 🌿', 'exito');
    }
  }

  async ejecutarLoginFacial() {
    const { correo, password } = this.loginView.getCredentialsFacial();
    const nombre = document.getElementById('facial-nombre')?.value?.trim() || null;
    if (!this.model.fotoCapturada) {
      this.loginView.mostrarMensaje('Primero captura tu foto 📷', 'error');
      return;
    }
    
    if (correo && password.length < 6) {
      this.loginView.mostrarMensaje('La contraseña debe tener al menos 6 caracteres para registrarte 🌿', 'error');
      return;
    }

    this.loginView.mostrarMensaje(
      correo
        ? '🌱 Registrando y vinculando tu rostro...'
        : '🔍 Buscando tu identidad biométrica...',
      ''
    );
    try {
      const respuesta = await this.model.loginFacialConNombre(correo, nombre, password, this.model.fotoCapturada);
      const nombreGuardian = respuesta?.usuario?.apodo || respuesta?.usuario?.nombre || 'Guardián';
      const mensaje = correo
        ? `✅ ¡Rostro vinculado! Bienvenido, ${nombreGuardian} 🌿`
        : `🎉 ¡Identidad verificada! Bienvenido de nuevo, ${nombreGuardian} 🌿`;
      this.mainView.toast(mensaje, 'exito');
      this.entrarApp();
    } catch (err) {
      if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Load failed'))) {
        this.loginView.mostrarMensaje('Rostro registrado localmente. ¡Bienvenido Guardián! 🌿', 'exito');
        this.model.activarDemo();
        if (nombre) {
          this.model.usuario.nombre = nombre;
          this.model.usuario.apodo = nombre;
        }
        this.model.guardarSesion();
        setTimeout(() => this.entrarApp(), 800);
        return;
      }
      this.loginView.mostrarMensaje(err.message || 'Error en el reconocimiento facial. Intenta de nuevo.', 'error');
    }
  }

  cerrarSesion() {
    this.model.cerrarSesion();
    this.loginView.limpiarFormularios();
    this.loginView.resetearCamara();
    this.mainView.mostrarPantalla('login');
    this.loginView.mostrarTab('correo');
    this.mainView.toast('¡Hasta pronto! Sigue cuidando el planeta 🌿', 'exito');
  }

  toggleTema() {
    const actual = document.documentElement.getAttribute('data-theme') || 'dark';
    const nuevo = actual === 'dark' ? 'light' : 'dark';
    
    // Deshabilitar animaciones temporalmente para el cambio de tema
    document.documentElement.classList.add('no-transition');
    
    this.mainView.aplicarTema(nuevo);
    localStorage.setItem('semiverd_tema', nuevo);
    
    // Forzar reflow
    window.getComputedStyle(document.documentElement).opacity;
    
    setTimeout(() => {
      document.documentElement.classList.remove('no-transition');
    }, 50);
  }

  entrarApp() {
    this.mainView.mostrarPantalla('app');
    this.mainView.actualizarTopbar(this.model.usuario);
    this.mainView.actualizarSidebar(this.model.usuario);
    this.irA('inicio');
    
    // Cargar datos
    this.cargarDatosApp();
  }

  async cargarDatosApp() {
    await this.model.fetchMisiones();
    this.homeView.renderRecentMisiones(this.model.misiones, (id) => this.abrirDetalleMision(id));
    
    const tipDia = await this.model.fetchTipDelDia();
    this.academiaView.renderTipDelDia(tipDia);

    await this.model.fetchTips();
  }

  async irA(vista) {
    this.model.vistaActual = vista;
    this.mainView.cambiarVista(vista);
    this.mainView.actualizarMenuNavegacion(vista);
    this.mainView.cerrarSidebar();

    const completadasCount = this.model.misiones.filter(m => m.estado === 'completada').length;

    switch (vista) {
      case 'inicio':
        this.homeView.actualizarBienvenida(this.model.usuario);
        this.homeView.renderRecentMisiones(this.model.misiones, (id) => this.abrirDetalleMision(id));
        break;
      case 'arbol':
        this.treeView.actualizarInfoNivel(this.model.usuario, completadasCount);
        this.treeView.renderMedallas(this.model.misiones);
        this.treeView.dibujarArbol(this.model.usuario.nivel_arbol);
        break;
      case 'camino':
        this.mapView.renderMapa(this.model.misiones, (id) => this.abrirDetalleMision(id), this.model.usuario);
        break;
      case 'misiones':
        this.missionView.renderMisiones(this.model.misiones, (id) => this.abrirDetalleMision(id));
        break;
      case 'academia':
        this.academiaView.renderTips(this.model.tips);
        // Reset active filter button state
        const allBtn = document.querySelector('.filtros-categoria .filtro-btn');
        this.academiaView.actualizarFiltrosActivos(allBtn);
        break;
      case 'ranking':
        const ranking = await this.model.fetchRanking();
        this.rankingView.renderRanking(ranking);
        break;
      case 'perfil':
        this.perfilView.renderPerfil(this.model.usuario, completadasCount);
        this.perfilView.actualizarEstadoServidor(this.model.hasRemoteBackend(), this.model.getApiUrl());
        break;
    }
  }

  abrirDetalleMision(misionId) {
    const m = this.model.misiones.find(x => x.id === misionId);
    if (!m) return;

    const callbacks = {
      onIniciar: (id) => this.ejecutarIniciarMision(id),
      onCompletar: (id) => this.ejecutarCompletarMision(id)
    };

    this.missionView.abrirModal(m, callbacks);
  }

  async ejecutarIniciarMision(misionId) {
    try {
      await this.model.iniciarMision(misionId);
      this.missionView.cerrarModal();
      this.mainView.toast('¡Misión iniciada! ¡A proteger el planeta! 🌿', 'exito');
      
      // Actualizar vista actual
      if (this.model.vistaActual === 'misiones') {
        this.missionView.renderMisiones(this.model.misiones, (id) => this.abrirDetalleMision(id));
      } else if (this.model.vistaActual === 'camino') {
        this.mapView.renderMapa(this.model.misiones, (id) => this.abrirDetalleMision(id), this.model.usuario);
      } else {
        this.irA(this.model.vistaActual);
      }
    } catch (err) {
      this.mainView.toast(err.message || 'Error al iniciar la misión', 'error');
    }
  }

  async ejecutarCompletarMision(misionId) {
    try {
      const res = await this.model.completarMision(misionId);
      this.missionView.cerrarModal();
      this.mainView.toast(`🎉 ¡+${res.puntos_ganados} puntos! ¡Misión completada!`, 'exito');
      
      // Sincronizar UI
      this.mainView.actualizarTopbar(this.model.usuario);
      this.mainView.actualizarSidebar(this.model.usuario);

      if (this.model.vistaActual === 'misiones') {
        this.missionView.renderMisiones(this.model.misiones, (id) => this.abrirDetalleMision(id));
      } else if (this.model.vistaActual === 'camino') {
        this.mapView.renderMapa(this.model.misiones, (id) => this.abrirDetalleMision(id), this.model.usuario);
      } else {
        this.irA(this.model.vistaActual);
      }
    } catch (err) {
      this.mainView.toast(err.message || 'Error al completar la misión', 'error');
    }
  }

  // ─── Perfil: Editar nombre ────────────────────────────────
  abrirEditorNombre() {
    const editor = document.getElementById('perfil-nombre-editor');
    const input = document.getElementById('perfil-nombre-input');
    const nombreActual = this.model.usuario?.apodo || this.model.usuario?.nombre || '';
    if (editor) {
      editor.classList.remove('oculto');
      if (input) { input.value = nombreActual; input.focus(); }
    }
  }

  cerrarEditorNombre() {
    const editor = document.getElementById('perfil-nombre-editor');
    if (editor) editor.classList.add('oculto');
  }

  async guardarNombrePerfil() {
    const input = document.getElementById('perfil-nombre-input');
    const nuevoNombre = input?.value?.trim();
    if (!nuevoNombre) {
      this.mainView.toast('Escribe un nombre válido 🌱', 'error');
      return;
    }
    try {
      // Guardar en backend y modelo local
      await this.model.actualizarPerfil({ nombre: nuevoNombre, apodo: nuevoNombre });
      this.cerrarEditorNombre();
      // Actualizar UI
      const perfilNombre = document.getElementById('perfil-nombre');
      if (perfilNombre) perfilNombre.textContent = nuevoNombre;
      this.mainView.actualizarSidebar(this.model.usuario);
      this.mainView.actualizarTopbar(this.model.usuario);
      const bienvenidaNombre = document.getElementById('bienvenida-nombre');
      if (bienvenidaNombre) bienvenidaNombre.textContent = nuevoNombre;
      this.mainView.toast(`✅ Nombre actualizado a "${nuevoNombre}" 🌿`, 'exito');
    } catch (err) {
      this.mainView.toast(err.message || 'Error al guardar el nombre', 'error');
    }
  }

  // ─── Perfil: Cambiar foto ─────────────────────────────────
  abrirSelectorFoto() {
    const input = document.getElementById('perfil-foto-input');
    if (input) input.click();
  }

  procesarFotoSeleccionada(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.mainView.toast('Por favor selecciona una imagen válida 📷', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      try {
        // Guardar en backend y modelo local
        await this.model.actualizarPerfil({ foto_perfil: base64 });
        // Actualizar todos los avatares en la UI
        this._actualizarFotoEnUI(base64);
        this.mainView.toast('✅ Foto de perfil actualizada 🌿', 'exito');
      } catch (err) {
        this.mainView.toast(err.message || 'Error al actualizar la foto de perfil', 'error');
      }
    };
    reader.readAsDataURL(file);
  }

  _actualizarFotoEnUI(base64) {
    const imgTag = `<img src="${base64}" alt="Foto de perfil" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;

    // Topbar avatar
    const headerAvatar = document.getElementById('header-avatar');
    if (headerAvatar) headerAvatar.innerHTML = imgTag;

    // Dropdown
    const ddIcon = document.getElementById('avatar-dd-icon');
    if (ddIcon) ddIcon.innerHTML = imgTag;

    // Sidebar avatar
    const sidebarAvatar = document.getElementById('sidebar-avatar-img');
    if (sidebarAvatar) sidebarAvatar.innerHTML = imgTag;

    // Perfil avatar
    const perfilDisplay = document.getElementById('perfil-avatar-display');
    if (perfilDisplay) perfilDisplay.innerHTML = imgTag;
  }

  iniciarAnimacionArbol() {
    const animar = () => {
      if (this.model.vistaActual === 'arbol') {
        this.treeView.dibujarArbol(this.model.usuario?.nivel_arbol || 1);
      } else if (this.model.vistaActual === 'inicio' && this.model.usuario) {
        this.homeView.dibujarArbolMini(
          this.model.usuario.nivel_arbol || 1, 
          this.treeView.dibujarRama.bind(this.treeView)
        );
      }
      this.animFrameArbol = requestAnimationFrame(animar);
    };
    animar();
  }

  // ─── Modal de Servidor y Conexión Backend ───────────────────
  abrirModalServidor() {
    const modal = document.getElementById('modal-servidor');
    const input = document.getElementById('servidor-url-input');
    const badgeText = document.getElementById('modal-servidor-status-text');
    const badge = document.getElementById('modal-servidor-badge');
    const msg = document.getElementById('servidor-mensaje');

    if (msg) msg.classList.add('oculto');
    if (input) input.value = localStorage.getItem('semivert_api_base') || window.SEMIVERT_API_BASE || '';

    const hasRemote = this.model.hasRemoteBackend();
    if (badgeText && badge) {
      if (hasRemote) {
        badgeText.textContent = `🌐 Conectado: ${this.model.getApiUrl()}`;
        badge.style.background = 'rgba(56, 189, 248, 0.15)';
        badge.style.color = '#38bdf8';
      } else {
        badgeText.textContent = '🟢 Modo Web Autónomo (Local)';
        badge.style.background = 'rgba(74, 222, 128, 0.15)';
        badge.style.color = '#4ade80';
      }
    }

    if (modal) modal.classList.remove('oculto');
  }

  cerrarModalServidor() {
    const modal = document.getElementById('modal-servidor');
    if (modal) modal.classList.add('oculto');
  }

  async guardarConfiguracionServidor() {
    const input = document.getElementById('servidor-url-input');
    const msg = document.getElementById('servidor-mensaje');
    let url = (input?.value || '').trim();

    if (!url) {
      this.resetearAModoAutonomo();
      return;
    }

    url = url.replace(/\/+$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    if (msg) {
      msg.textContent = 'Probando conexión con el servidor backend... 🔄';
      msg.className = 'mensaje';
      msg.classList.remove('oculto');
    }

    try {
      const resp = await fetch(`${url}/salud`, { method: 'GET' });
      if (resp.ok) {
        localStorage.setItem('semivert_api_base', url);
        window.SEMIVERT_API_BASE = url;
        if (msg) {
          msg.textContent = '¡Conexión exitosa con el backend de Semivert! 🌿';
          msg.className = 'mensaje exito';
        }
        this.mainView.toast('Backend conectado correctamente 🚀', 'exito');
        setTimeout(() => {
          this.cerrarModalServidor();
          this.perfilView.actualizarEstadoServidor(true, url);
        }, 800);
      } else {
        throw new Error(`El servidor respondió con código HTTP ${resp.status}`);
      }
    } catch (err) {
      localStorage.setItem('semivert_api_base', url);
      window.SEMIVERT_API_BASE = url;
      if (msg) {
        msg.textContent = `URL guardada. (Aviso: /salud no respondió: ${err.message}. La app usará fallback web automático).`;
        msg.className = 'mensaje error';
      }
      this.mainView.toast('URL guardada con fallback local activo ⚠️', 'info');
      setTimeout(() => {
        this.cerrarModalServidor();
        this.perfilView.actualizarEstadoServidor(true, url);
      }, 2000);
    }
  }

  resetearAModoAutonomo() {
    localStorage.removeItem('semivert_api_base');
    window.SEMIVERT_API_BASE = '';
    const msg = document.getElementById('servidor-mensaje');
    if (msg) {
      msg.textContent = 'Modo Web Autónomo activado. Tus datos se guardan en el navegador 🌿';
      msg.className = 'mensaje exito';
      msg.classList.remove('oculto');
    }
    this.mainView.toast('Modo Web Autónomo activado 🟢', 'exito');
    setTimeout(() => {
      this.cerrarModalServidor();
      this.perfilView.actualizarEstadoServidor(false, '');
    }, 600);
  }
}
