// Limpieza de contactos de LinkedIn por palabras clave en el titular.
//
// Uso: abre https://www.linkedin.com/mynetwork/invite-connect/connections/,
// F12 -> Consola, pega esto y dale a Enter.
//
// Por defecto es un ensayo: solo marca en rojo a quién borraría, sin tocar nada.
// Cuando te convenza la lista, pon VISTA_PREVIA = false y vuelve a pegarlo.
(async () => {
  // ---------- Ajustes ----------
  const VISTA_PREVIA = true;
  const MAX_BORRADOS = 50; // tope por ejecución, para no ir a lo loco
  const PALABRAS = /\b(recruiter|recruiting|talent|headhunter|reclutad\w*|recursos humanos|rrhh|hr|seleccion|selección)\b/i;

  // ---------- Utilidades ----------
  const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const respirar = () => dormir(2500 + Math.random() * 2500); // pausa de persona, no de robot

  // Repite `buscar` cada 100 ms hasta que devuelva algo (o se agote el tiempo).
  const esperar = async (buscar, ms = 5000) => {
    for (let t = 0; t < ms; t += 100) {
      const res = buscar();
      if (res) return res;
      await dormir(100);
    }
  };

  const botonesConTexto = (texto) =>
    [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === texto);

  // El ítem del menú es un <div role="menuitem">, no un botón.
  const opcionDeMenu = (texto) =>
    [...document.querySelectorAll('[role=menuitem]')].find((e) => e.textContent.trim() === texto);

  // "Alejandra Merani" -> "Alejandra M*" (para no ir soltando nombres por la consola)
  const censurar = (nombre = '') => {
    const [pila, apellido] = nombre.split(/\s+/);
    return apellido ? `${pila} ${apellido[0]}*` : pila;
  };

  // ---------- Lo que hace falta para cada contacto ----------
  const leerContacto = (tarjeta) => {
    const textos = tarjeta.querySelectorAll('a[href*="/in/"]:not([style]) p');
    return {
      nombre: textos[0]?.textContent.trim(),
      titular: textos[1]?.textContent.trim() || '',
    };
  };

  // Menú "Más acciones" -> "Eliminar contacto" -> confirmación. Devuelve true si llegó hasta el final.
  const borrarContacto = async (tarjeta, nombre) => {
    // El menú se cierra solo si hay scroll en marcha, así que primero scroll y luego esperar a que pare.
    tarjeta.scrollIntoView({ block: 'center', behavior: 'instant' });
    await dormir(600);
    tarjeta.querySelector('button[aria-label^="Más acciones"]').click();

    const opcionMenu = await esperar(() => opcionDeMenu('Eliminar contacto'));
    if (!opcionMenu) {
      console.warn('El menú no apareció, me lo salto:', censurar(nombre));
      document.body.click(); // cierra lo que haya quedado abierto
      return false;
    }
    opcionMenu.click();

    // El modal tiene título "Eliminar contacto" (h2) y el botón con el mismo texto; solo busco el botón.
    const confirmar = await esperar(() => botonesConTexto('Eliminar contacto')[0]);
    if (!confirmar) {
      const botones = [...document.querySelectorAll('[role=dialog] button, [role=alertdialog] button')].map((b) => b.textContent.trim());
      console.warn('La confirmación no apareció, me lo salto:', censurar(nombre), 'botones del modal:', botones);
      botonesConTexto('Cancelar')[0]?.click();
      return false;
    }
    confirmar.click();
    return true;
  };

  // ---------- Bucle principal ----------
  const vistas = new Set();   // tarjetas que ya miré, para no repetir
  const candidatos = [];      // coincidencias en modo vista previa
  let borrados = 0;
  let intentosSinNovedad = 0;

  while (borrados + candidatos.length < MAX_BORRADOS && intentosSinNovedad < 3) {
    const nuevas = [...document.querySelectorAll('[componentkey^="ConnectionCard_"]')]
      .filter((t) => !vistas.has(t.getAttribute('componentkey')));

    // Sin tarjetas nuevas: bajo hasta el final para que LinkedIn cargue más.
    if (!nuevas.length) {
      window.scrollTo(0, document.body.scrollHeight);
      await dormir(2000);
      intentosSinNovedad++;
      continue;
    }
    intentosSinNovedad = 0;

    for (const tarjeta of nuevas) {
      vistas.add(tarjeta.getAttribute('componentkey'));
      const { nombre, titular } = leerContacto(tarjeta);
      if (!PALABRAS.test(titular)) continue;

      console.log(VISTA_PREVIA ? 'BORRARÍA:' : 'Borrando:', censurar(nombre), '|', titular);

      if (VISTA_PREVIA) {
        candidatos.push(nombre);
        tarjeta.style.outline = '3px solid red';
        continue;
      }

      if (await borrarContacto(tarjeta, nombre)) {
        borrados++;
        await respirar();
      }
    }
  }

  console.log(
    VISTA_PREVIA
      ? `VISTA PREVIA: ${candidatos.length} coincidencias (en rojo)`
      : `Eliminados: ${borrados}`
  );
})();
