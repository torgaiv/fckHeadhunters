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
  const PALABRAS = /\b(IA|recruiter|recruiting|talent|headhunter|reclutad\w*|recursos humanos|rrhh|hr|seleccion|selección)\b/i;

  // ---------- Utilidades ----------
  const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const respirar = () => dormir(2500 + Math.random() * 2500); // pausa de persona, no de robot

  // loopea cada 100 ms hasta que devuelva algo o timeout.
  const esperar = async (buscar, ms = 5000) => {
    for (let t = 0; t < ms; t += 100) {
      const res = buscar();
      if (res) return res;
      await dormir(100);
    }
  };

  const botonesConTexto = (texto) =>
    [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === texto);

  // busca el boton .
  const elementoConTexto = (texto) =>
    [...document.querySelectorAll('body *')].find(
      (e) => !e.children.length && e.textContent.trim() === texto && e.offsetParent
    );

  // censura 
  const censurar = (nombre = '') => {
    const [pila, apellido] = nombre.split(/\s+/);
    return apellido ? `${pila} ${apellido[0]}*` : pila;
  };

  // ---------- main ----------
  const leerContacto = (tarjeta) => {
    const textos = tarjeta.querySelectorAll('a[href*="/in/"]:not([style]) p');
    return {
      nombre: textos[0]?.textContent.trim(),
      titular: textos[1]?.textContent.trim() || '',
    };
  };

  // Menú "Más acciones" -> "Eliminar contacto" -> confirmación. Devuelve true si llegó hasta el final.
  const borrarContacto = async (tarjeta, nombre) => {
    tarjeta.scrollIntoView({ block: 'center' });
    tarjeta.querySelector('button[aria-label^="Más acciones"]').click();

    const opcionMenu = await esperar(() => elementoConTexto('Eliminar contacto'));
    if (!opcionMenu) {
      console.warn(
        'El menú no apareció, me lo salto:', censurar(nombre),
        document.querySelector('[role=menu],[role=listbox],[popover]')?.outerHTML.slice(0, 600)
      );
      document.body.click(); // cierra lo que haya quedado abierto
      return false;
    }
    opcionMenu.click();

    // El modal repite el texto "Eliminar contacto" (título + botón)
    const confirmar = await esperar(() =>
      botonesConTexto('Eliminar contacto').find((b) => b.isConnected && !b.contains(opcionMenu))
    );
    if (!confirmar) {
      console.warn('La confirmación no apareció, me lo salto:', censurar(nombre));
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
