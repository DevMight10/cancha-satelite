import { html, iconos } from '../utils/dom.js';

/**
 * Diálogo de confirmación accesible (<dialog> nativo).
 *   const ok = await confirmar({ titulo, mensaje, aceptar: 'Sí, cancelar', peligro: true });
 * Con `pedirTexto` devuelve el texto escrito (o null si se canceló).
 */
export function confirmar({
  titulo,
  mensaje = '',
  aceptar = 'Aceptar',
  cancelar = 'Volver',
  peligro = false,
  pedirTexto = null, // { etiqueta, requerido, placeholder }
}) {
  return new Promise((resolver) => {
    const dialogo = document.createElement('dialog');
    dialogo.className = 'dialogo';
    dialogo.innerHTML = html`
      <form method="dialog">
        <div class="dialogo-cuerpo">
          <h2>${titulo}</h2>
          ${mensaje ? html`<p class="texto-suave">${mensaje}</p>` : ''}
          ${pedirTexto ? html`
            <div class="campo">
              <label for="dialogo-texto">${pedirTexto.etiqueta}</label>
              <textarea class="control" id="dialogo-texto" maxlength="255" placeholder="${pedirTexto.placeholder ?? ''}" ${pedirTexto.requerido ? 'required' : ''}></textarea>
            </div>` : ''}
        </div>
        <div class="dialogo-acciones">
          <button type="button" class="btn" value="cancelar">${cancelar}</button>
          <button type="submit" class="btn ${peligro ? 'btn-peligro-lleno' : 'btn-primario'}" value="aceptar">${aceptar}</button>
        </div>
      </form>`.__html;

    document.body.append(dialogo);
    iconos();

    const texto = dialogo.querySelector('#dialogo-texto');
    let resultado = pedirTexto ? null : false;

    dialogo.querySelector('button[value="cancelar"]').addEventListener('click', () => dialogo.close());
    dialogo.querySelector('form').addEventListener('submit', (e) => {
      if (texto && pedirTexto.requerido && !texto.value.trim()) {
        e.preventDefault();
        texto.focus();
        return;
      }
      resultado = pedirTexto ? texto.value.trim() : true;
    });
    dialogo.addEventListener('close', () => {
      dialogo.remove();
      resolver(resultado);
    });

    dialogo.showModal();
    (texto ?? dialogo.querySelector('button[value="cancelar"]')).focus();
  });
}
