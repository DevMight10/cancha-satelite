import { authApi } from '../api/authApi.js';
import { enviarFormulario } from '../components/formulario.js';
import { iniciarPagina } from '../core/pagina.js';
import { inicioSegunRol, rutaSegura } from '../guards/auth.js';
import { $ } from '../utils/dom.js';

await iniciarPagina({ acceso: 'invitado' });

const form = $('#form-registro');
$('#nombre').focus();

$('#ver-password').addEventListener('change', (e) => {
  $('#password').type = e.target.checked ? 'text' : 'password';
});

enviarFormulario(form, async (datos) => {
  const usuario = await authApi.registro(datos);
  const volver = rutaSegura(new URLSearchParams(location.search).get('volver'));
  location.href = volver ?? inicioSegunRol(usuario);
});
