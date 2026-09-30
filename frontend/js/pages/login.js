import { authApi } from '../api/authApi.js';
import { enviarFormulario } from '../components/formulario.js';
import { iniciarPagina } from '../core/pagina.js';
import { inicioSegunRol, rutaSegura } from '../guards/auth.js';
import { canchaFondo } from '../components/cancha.js';
import { $ } from '../utils/dom.js';

$('#auth-cancha-fondo').innerHTML = canchaFondo({ oscurecer: 'abajo' }).__html;
await iniciarPagina({ acceso: 'invitado' });

const form = $('#form-login');
$('#email').focus();

enviarFormulario(form, async ({ email, password }) => {
  const usuario = await authApi.login(email, password);
  const volver = rutaSegura(new URLSearchParams(location.search).get('volver'));
  location.href = volver ?? inicioSegunRol(usuario);
});
