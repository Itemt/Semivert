/**
 * state.js
 * Model: Gestiona el estado de la aplicación, llamadas a la API y persistencia local inteligente.
 * Soporta modo web autónomo (Vercel/PWA) y modo híbrido con backend remoto FastAPI.
 */

import { getApiBase, DATOS_DEMO } from '../config.js';

export class StateModel {
  constructor() {
    this.token = null;
    this.usuario = null;
    this.misiones = [];
    this.tips = [];
    this.vistaActual = 'inicio';
    this.streamCamara = null;
    this.fotoCapturada = null;
    this.misionesCargadas = false;
  }

  hasRemoteBackend() {
    if (typeof window === 'undefined') return false;
    const url = getApiBase();
    // Debe existir y no ser idéntico al origin si el origin no tiene backend montado
    return Boolean(url && url.trim().length > 0 && url !== window.location.origin);
  }

  getApiUrl() {
    return getApiBase();
  }

  isDemo() {
    return this.token === 'demo-token';
  }

  /* ──────────────────────────────────────────────────────────
     Almacenamiento Local de Usuarios y Misiones (Web Engine)
  ────────────────────────────────────────────────────────── */
  _getUsersDb() {
    try {
      const raw = localStorage.getItem('semivert_users_db');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}

    const defaultUsers = [
      {
        id: 1,
        nombre: 'Demo Guardián',
        apodo: 'El Guardián Verde',
        correo: 'demo@semiverd.com',
        password: 'demo123',
        puntos_totales: 350,
        nivel: 'Brote',
        nivel_arbol: 3,
        racha_dias: 5,
        monedas_verdes: 35,
        foto_perfil: null,
        misiones_completadas: 1,
        fecha_registro: new Date().toISOString()
      }
    ];
    this._saveUsersDb(defaultUsers);
    return defaultUsers;
  }

  _saveUsersDb(users) {
    try {
      localStorage.setItem('semivert_users_db', JSON.stringify(users));
    } catch (e) {
      console.warn('Error guardando base de usuarios local:', e);
    }
  }

  _getUserMissions(userId) {
    try {
      const raw = localStorage.getItem(`semivert_misiones_${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}

    const misiones = JSON.parse(JSON.stringify(DATOS_DEMO.misiones));
    if (userId !== 1) {
      // Para usuarios nuevos, iniciar con la misión 1 disponible y las siguientes bloqueadas
      misiones.forEach((m, idx) => {
        m.estado = idx === 0 ? 'disponible' : 'bloqueada';
        m.porcentaje_completado = 0;
        m.puntos_ganados = 0;
      });
    }
    this._saveUserMissions(userId, misiones);
    return misiones;
  }

  _saveUserMissions(userId, misiones) {
    try {
      localStorage.setItem(`semivert_misiones_${userId}`, JSON.stringify(misiones));
    } catch (e) {
      console.warn('Error guardando misiones locales:', e);
    }
  }

  /* ──────────────────────────────────────────────────────────
     Manejo de Sesión
  ────────────────────────────────────────────────────────── */
  cargarSesionGuardada() {
    const tokenGuardado = localStorage.getItem('semiverd_token');
    const usuarioGuardado = localStorage.getItem('semiverd_usuario');
    const demoActivo = localStorage.getItem('semiverd_demo');

    if (demoActivo === 'true') {
      this.activarDemo();
      return true;
    }

    if (tokenGuardado && usuarioGuardado) {
      try {
        this.token = tokenGuardado;
        this.usuario = JSON.parse(usuarioGuardado);
        this.misiones = this._getUserMissions(this.usuario.id || 1);
        this.tips = [...DATOS_DEMO.tips];
        return true;
      } catch (_) {
        this.cerrarSesion();
        return false;
      }
    }

    return false;
  }

  async verificarToken() {
    if (this.isDemo() || (this.token && this.token.startsWith('web-token-'))) {
      return true;
    }
    if (!this.hasRemoteBackend()) {
      return Boolean(this.usuario);
    }
    try {
      this.usuario = await this.api('GET', '/auth/yo');
      this.guardarSesion();
      return true;
    } catch (err) {
      if (this.usuario) return true;
      this.cerrarSesion();
      return false;
    }
  }

  guardarSesion() {
    if (this.token) localStorage.setItem('semiverd_token', this.token);
    if (this.usuario) localStorage.setItem('semiverd_usuario', JSON.stringify(this.usuario));
    localStorage.removeItem('semiverd_demo');
  }

  activarDemo() {
    this.usuario = { ...DATOS_DEMO.usuario };
    this.token = 'demo-token';
    this.misiones = JSON.parse(JSON.stringify(DATOS_DEMO.misiones));
    this.tips = [...DATOS_DEMO.tips];
    localStorage.setItem('semiverd_demo', 'true');
    localStorage.removeItem('semiverd_token');
    localStorage.removeItem('semiverd_usuario');
  }

  cerrarSesion() {
    this.token = null;
    this.usuario = null;
    this.misiones = [];
    this.tips = [];
    this.misionesCargadas = false;
    this.fotoCapturada = null;

    if (this.streamCamara) {
      try {
        this.streamCamara.getTracks().forEach(t => t.stop());
      } catch (_) {}
      this.streamCamara = null;
    }

    localStorage.removeItem('semiverd_token');
    localStorage.removeItem('semiverd_usuario');
    localStorage.removeItem('semiverd_demo');
  }

  /* ──────────────────────────────────────────────────────────
     Cliente HTTP para Backend Remoto (FastAPI)
  ────────────────────────────────────────────────────────── */
  async api(metodo, ruta, cuerpo = null) {
    const baseUrl = this.getApiUrl();
    if (!baseUrl) {
      throw new Error('Servidor backend no configurado.');
    }

    const opciones = {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
    };

    if (this.token && !this.token.startsWith('demo-') && !this.token.startsWith('web-token-')) {
      opciones.headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (cuerpo) {
      opciones.body = JSON.stringify(cuerpo);
    }

    const respuesta = await fetch(`${baseUrl}${ruta}`, opciones);

    if (respuesta.status === 401) {
      if (!ruta.includes('/auth/login')) {
        this.cerrarSesion();
        window.location.reload();
        throw new Error("Sesión expirada. Por favor, ingresa de nuevo.");
      }
    }

    if (!respuesta.ok) {
      let mensajeError = `Error ${respuesta.status}`;
      try {
        const error = await respuesta.json();
        const detail = error.detail;

        if (typeof detail === 'string') {
          mensajeError = detail;
        } else if (Array.isArray(detail)) {
          const primerError = detail[0];
          mensajeError = primerError?.msg?.replace(/^Value error,\s*/i, '') || primerError?.message || 'Datos inválidos.';
        } else if (detail && typeof detail === 'object') {
          mensajeError = detail.message || detail.msg || JSON.stringify(detail);
        } else if (error.message) {
          mensajeError = error.message;
        }
      } catch (_) {}
      throw new Error(mensajeError);
    }

    return respuesta.json();
  }

  /* ──────────────────────────────────────────────────────────
     Autenticación (Híbrida: Remota con Fallback Web Local)
  ────────────────────────────────────────────────────────── */
  async loginCorreo(correo, password) {
    if (this.hasRemoteBackend()) {
      try {
        const respuesta = await this.api('POST', '/auth/login', { correo, password });
        this.token = respuesta.access_token;
        this.usuario = respuesta.usuario;
        this.guardarSesion();
        return respuesta;
      } catch (err) {
        console.warn('Backend remoto no disponible o error de login:', err.message);
        // Si el backend respondió 401 (credenciales erróneas), propagar el error exacto
        if (err.message && !err.message.includes('404') && !err.message.includes('501') && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
          throw err;
        }
      }
    }

    // Modo Web Local Autónomo
    const emailNorm = (correo || '').trim().toLowerCase();
    const users = this._getUsersDb();
    const user = users.find(u => u.correo.toLowerCase() === emailNorm);

    if (!user) {
      throw new Error('Este correo no está registrado. Puedes registrarte en la pestaña Registrarse 🌱');
    }

    if (user.password && user.password !== password) {
      throw new Error('Contraseña incorrecta. Por favor verifica tus credenciales.');
    }

    this.token = 'web-token-' + user.id;
    this.usuario = { ...user };
    this.misiones = this._getUserMissions(user.id);
    this.tips = [...DATOS_DEMO.tips];
    this.guardarSesion();

    return { access_token: this.token, usuario: this.usuario };
  }

  async registrarUsuario(nombre, apodo, correo, password) {
    if (this.hasRemoteBackend()) {
      try {
        await this.api('POST', '/auth/registrar', { nombre, apodo, correo, password });
        return this.loginCorreo(correo, password);
      } catch (err) {
        console.warn('Backend remoto no disponible para registro:', err.message);
        if (err.message && !err.message.includes('404') && !err.message.includes('501') && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
          throw err;
        }
      }
    }

    // Modo Web Local Autónomo
    const emailNorm = (correo || '').trim().toLowerCase();
    const users = this._getUsersDb();
    if (users.some(u => u.correo.toLowerCase() === emailNorm)) {
      throw new Error('Este correo ya está registrado. Ingresa con tu contraseña 🌱');
    }

    const nuevoUsuario = {
      id: Date.now(),
      nombre: (nombre || 'Guardián').trim(),
      apodo: (apodo || nombre || 'Guardián').trim(),
      correo: emailNorm,
      password: password,
      puntos_totales: 0,
      nivel: 'Semilla',
      nivel_arbol: 1,
      racha_dias: 1,
      monedas_verdes: 15,
      foto_perfil: null,
      misiones_completadas: 0,
      fecha_registro: new Date().toISOString()
    };

    users.push(nuevoUsuario);
    this._saveUsersDb(users);

    // Misiones iniciales para el usuario
    const misionesIniciales = JSON.parse(JSON.stringify(DATOS_DEMO.misiones)).map((m, idx) => ({
      ...m,
      estado: idx === 0 ? 'disponible' : 'bloqueada',
      porcentaje_completado: 0,
      puntos_ganados: 0
    }));
    this._saveUserMissions(nuevoUsuario.id, misionesIniciales);

    this.token = 'web-token-' + nuevoUsuario.id;
    this.usuario = { ...nuevoUsuario };
    this.misiones = misionesIniciales;
    this.tips = [...DATOS_DEMO.tips];
    this.guardarSesion();

    return { access_token: this.token, usuario: this.usuario };
  }

  async loginFacial(correo, fotoBase64) {
    return this.loginFacialConNombre(correo, null, null, fotoBase64);
  }

  async loginFacialConNombre(correo, nombre, password, fotoBase64) {
    if (this.hasRemoteBackend()) {
      try {
        const respuesta = await this.api('POST', '/auth/login-facial', {
          imagen_base64: fotoBase64,
          correo: correo || null,
          nombre: nombre || null,
          password: password || null
        });
        this.token = respuesta.access_token;
        this.usuario = respuesta.usuario;
        this.guardarSesion();
        return respuesta;
      } catch (err) {
        console.warn('Backend remoto no disponible para Face ID:', err.message);
        if (err.message && !err.message.includes('404') && !err.message.includes('501') && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
          throw err;
        }
      }
    }

    // Modo Web Local Autónomo
    const users = this._getUsersDb();
    let user = null;

    if (correo) {
      const emailNorm = correo.trim().toLowerCase();
      user = users.find(u => u.correo.toLowerCase() === emailNorm);
      if (!user) {
        // Nuevo registro con rostro
        user = {
          id: Date.now(),
          nombre: (nombre || 'Guardián Verde').trim(),
          apodo: (nombre || 'Guardián').trim(),
          correo: emailNorm,
          password: password || 'facial-pass',
          foto_perfil: fotoBase64,
          puntos_totales: 0,
          nivel: 'Semilla',
          nivel_arbol: 1,
          racha_dias: 1,
          monedas_verdes: 15,
          misiones_completadas: 0,
          fecha_registro: new Date().toISOString()
        };
        users.push(user);
        this._saveUsersDb(users);
        const misionesIniciales = JSON.parse(JSON.stringify(DATOS_DEMO.misiones)).map((m, idx) => ({
          ...m,
          estado: idx === 0 ? 'disponible' : 'bloqueada',
          porcentaje_completado: 0,
          puntos_ganados: 0
        }));
        this._saveUserMissions(user.id, misionesIniciales);
      } else {
        // Asociar foto al usuario existente
        user.foto_perfil = fotoBase64;
        if (nombre && (!user.nombre || user.nombre === 'Demo Guardián')) {
          user.nombre = nombre;
          user.apodo = nombre;
        }
        this._saveUsersDb(users);
      }
    } else {
      // Reconocimiento rápido: buscar usuario con foto de perfil o el último activo
      user = users.find(u => u.foto_perfil) || users[0];
      if (user && fotoBase64 && !user.foto_perfil) {
        user.foto_perfil = fotoBase64;
        this._saveUsersDb(users);
      }
      if (!user) {
        user = {
          id: Date.now(),
          nombre: 'Guardián Verde',
          apodo: 'Guardián Facial',
          correo: 'guardian@semivert.co',
          password: 'pass',
          foto_perfil: fotoBase64,
          puntos_totales: 50,
          nivel: 'Semilla',
          nivel_arbol: 1,
          racha_dias: 1,
          monedas_verdes: 15,
          misiones_completadas: 0
        };
        users.push(user);
        this._saveUsersDb(users);
      }
    }

    this.token = 'web-token-' + user.id;
    this.usuario = { ...user };
    this.misiones = this._getUserMissions(user.id);
    this.tips = [...DATOS_DEMO.tips];
    this.guardarSesion();

    return { access_token: this.token, usuario: this.usuario };
  }

  /* ──────────────────────────────────────────────────────────
     Perfil y Personalización
  ────────────────────────────────────────────────────────── */
  async actualizarPerfil({ nombre, apodo, foto_perfil }) {
    if (this.isDemo()) {
      if (nombre !== undefined && nombre !== null) {
        this.usuario.nombre = nombre;
        this.usuario.apodo = apodo || nombre;
      }
      if (foto_perfil !== undefined && foto_perfil !== null) {
        this.usuario.foto_perfil = foto_perfil;
      }
      this.guardarSesion();
      return this.usuario;
    }

    if (nombre !== undefined && nombre !== null) {
      this.usuario.nombre = nombre;
      this.usuario.apodo = apodo || nombre;
    }
    if (foto_perfil !== undefined && foto_perfil !== null) {
      this.usuario.foto_perfil = foto_perfil;
    }

    // Guardar en base local
    if (this.usuario?.id) {
      const users = this._getUsersDb();
      const idx = users.findIndex(u => u.id === this.usuario.id);
      if (idx !== -1) {
        users[idx] = { ...this.usuario };
        this._saveUsersDb(users);
      }
    }
    this.guardarSesion();

    // Sincronizar con backend si está activo
    if (this.hasRemoteBackend() && !this.token?.startsWith('web-token-')) {
      try {
        const respuesta = await this.api('PUT', '/usuarios/perfil', {
          nombre: nombre || null,
          apodo: apodo || null,
          foto_perfil: foto_perfil || null
        });
        this.usuario = respuesta;
        this.guardarSesion();
        return respuesta;
      } catch (e) {
        console.warn('No se pudo sincronizar perfil con backend remoto:', e);
      }
    }

    return this.usuario;
  }

  /* ──────────────────────────────────────────────────────────
     Misiones y Gamificación
  ────────────────────────────────────────────────────────── */
  async fetchMisiones() {
    if (this.isDemo()) {
      return this.misiones;
    }

    if (this.hasRemoteBackend() && !this.token?.startsWith('web-token-')) {
      try {
        const misiones = await this.api('GET', '/misiones/');
        this.misiones = misiones;
        this.misionesCargadas = true;
        return this.misiones;
      } catch (err) {
        console.warn('Error cargando misiones desde API remota, usando almacenamiento local:', err);
      }
    }

    if (this.usuario?.id) {
      this.misiones = this._getUserMissions(this.usuario.id);
    } else if (!this.misiones.length) {
      this.misiones = JSON.parse(JSON.stringify(DATOS_DEMO.misiones));
    }
    this.misionesCargadas = true;
    return this.misiones;
  }

  async fetchTips() {
    if (this.isDemo()) {
      this.tips = DATOS_DEMO.tips;
      return this.tips;
    }

    if (this.hasRemoteBackend() && !this.token?.startsWith('web-token-')) {
      try {
        const todos = await this.api('GET', '/tips/');
        this.tips = todos;
        return this.tips;
      } catch (_) {}
    }

    if (!this.tips.length) {
      this.tips = DATOS_DEMO.tips;
    }
    return this.tips;
  }

  async fetchTipDelDia() {
    if (this.isDemo() || !this.hasRemoteBackend() || this.token?.startsWith('web-token-')) {
      const hoy = new Date().getDay();
      const tipsList = this.tips.length ? this.tips : DATOS_DEMO.tips;
      return tipsList[hoy % tipsList.length] || DATOS_DEMO.tips[0];
    }

    try {
      return await this.api('GET', '/tips/diario');
    } catch (err) {
      return this.tips[0] || DATOS_DEMO.tips[0];
    }
  }

  async iniciarMision(misionId) {
    if (this.hasRemoteBackend() && !this.isDemo() && !this.token?.startsWith('web-token-')) {
      try {
        await this.api('POST', `/misiones/${misionId}/iniciar`);
      } catch (err) {
        console.warn('Error iniciando misión en API remota, continuando localmente:', err);
      }
    }

    const m = this.misiones.find(x => x.id === misionId);
    if (m) {
      m.estado = 'en_progreso';
      if (this.usuario?.id) {
        this._saveUserMissions(this.usuario.id, this.misiones);
      }
    }
    return m;
  }

  async completarMision(misionId) {
    if (this.hasRemoteBackend() && !this.isDemo() && !this.token?.startsWith('web-token-')) {
      try {
        const resultado = await this.api('POST', `/misiones/${misionId}/completar`);
        const m = this.misiones.find(x => x.id === misionId);
        if (m) {
          m.estado = 'completada';
          m.porcentaje_completado = 100;
          const siguiente = this.misiones.find(x => x.orden === m.orden + 1);
          if (siguiente && siguiente.estado === 'bloqueada') {
            siguiente.estado = 'disponible';
          }
        }
        this.usuario.puntos_totales = resultado.puntos_totales;
        this.usuario.nivel = resultado.nivel;
        this.usuario.nivel_arbol = resultado.nivel_arbol;
        this.guardarSesion();
        return resultado;
      } catch (err) {
        console.warn('Error completando misión en backend remoto, aplicando guardado local:', err);
      }
    }

    // Modo Web Autónomo Local
    const m = this.misiones.find(x => x.id === misionId);
    if (m) {
      const puntosGanados = m.puntos_recompensa || 100;
      m.estado = 'completada';
      m.porcentaje_completado = 100;
      m.puntos_ganados = puntosGanados;

      this.usuario.puntos_totales = (this.usuario.puntos_totales || 0) + puntosGanados;
      this.usuario.monedas_verdes = (this.usuario.monedas_verdes || 0) + (m.monedas_recompensa || 10);
      this.usuario.misiones_completadas = (this.usuario.misiones_completadas || 0) + 1;
      this.usuario.nivel_arbol = this.calcularNivelArbol(this.usuario.puntos_totales);

      let n = 'Semilla';
      if (this.usuario.puntos_totales >= 1200) n = 'Maestro del Bosque';
      else if (this.usuario.puntos_totales >= 700) n = 'Guardián';
      else if (this.usuario.puntos_totales >= 350) n = 'Árbol';
      else if (this.usuario.puntos_totales >= 100) n = 'Brote';
      this.usuario.nivel = n;

      // Desbloquear siguiente misión
      const siguiente = this.misiones.find(x => x.orden === m.orden + 1);
      if (siguiente && siguiente.estado === 'bloqueada') {
        siguiente.estado = 'disponible';
      }

      // Persistir misiones y usuario
      if (this.usuario?.id) {
        this._saveUserMissions(this.usuario.id, this.misiones);
        const users = this._getUsersDb();
        const idx = users.findIndex(u => u.id === this.usuario.id);
        if (idx !== -1) {
          users[idx] = { ...this.usuario };
          this._saveUsersDb(users);
        }
      }
      this.guardarSesion();
    }

    return {
      puntos_ganados: m?.puntos_recompensa || 0,
      puntos_totales: this.usuario.puntos_totales,
      nivel: this.usuario.nivel,
      nivel_arbol: this.usuario.nivel_arbol
    };
  }

  calcularNivelArbol(puntos) {
    if (puntos < 100)  return 1;
    if (puntos < 250)  return 2;
    if (puntos < 450)  return 3;
    if (puntos < 700)  return 4;
    if (puntos < 1000) return 5;
    if (puntos < 1350) return 6;
    if (puntos < 1750) return 7;
    if (puntos < 2200) return 8;
    if (puntos < 2700) return 9;
    return 10;
  }

  /* ──────────────────────────────────────────────────────────
     Tabla de Posiciones (Ranking)
  ────────────────────────────────────────────────────────── */
  async fetchRanking() {
    const rankingPersonajes = [
      { id: 'juliana', posicion: 1, nombre: 'Juliana G.', apodo: 'Guardiana del Río', puntos_totales: 1200, nivel: 'Guardián', nivel_arbol: 8 },
      { id: 'sofia',   posicion: 2, nombre: 'Sofía M.',   apodo: 'Reforestadora Mayor', puntos_totales: 950,  nivel: 'Árbol',    nivel_arbol: 6 },
      { id: 'camila',  posicion: 3, nombre: 'Camila P.',  apodo: 'Maestra del Reciclaje', puntos_totales: 700,  nivel: 'Árbol',    nivel_arbol: 5 },
      { id: 'giohan',  posicion: 4, nombre: 'Giohan R.',  apodo: 'Ingeniero Verde', puntos_totales: 450,  nivel: 'Brote',    nivel_arbol: 3 },
    ];

    if (this.hasRemoteBackend() && !this.isDemo() && !this.token?.startsWith('web-token-')) {
      try {
        return await this.api('GET', '/usuarios/ranking');
      } catch (_) {}
    }

    const users = this._getUsersDb();
    const todos = [...rankingPersonajes];

    users.forEach(u => {
      const esActual = this.usuario && u.id === this.usuario.id;
      const pts = esActual ? (this.usuario.puntos_totales || 0) : (u.puntos_totales || 0);
      const nivel = esActual ? (this.usuario.nivel || 'Semilla') : (u.nivel || 'Semilla');
      const arbol = esActual ? (this.usuario.nivel_arbol || 1) : (u.nivel_arbol || 1);

      todos.push({
        id: u.id,
        nombre: (u.nombre || 'Guardián') + (esActual ? ' (Tú)' : ''),
        apodo: u.apodo || 'Guardián Verde',
        puntos_totales: pts,
        nivel: nivel,
        nivel_arbol: arbol
      });
    });

    if (this.isDemo() && !todos.some(t => t.nombre.includes('(Tú)'))) {
      todos.push({
        id: 'demo-me',
        nombre: (this.usuario?.nombre || 'Demo Guardián') + ' (Tú)',
        apodo: this.usuario?.apodo || 'El Guardián Verde',
        puntos_totales: this.usuario?.puntos_totales || 350,
        nivel: this.usuario?.nivel || 'Brote',
        nivel_arbol: this.usuario?.nivel_arbol || 3
      });
    }

    todos.sort((a, b) => b.puntos_totales - a.puntos_totales);
    return todos.map((item, idx) => ({ ...item, posicion: idx + 1 }));
  }
}
