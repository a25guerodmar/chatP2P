const socket = io();

// Elementos del HTML
const pantallaNombre = document.getElementById('pantallaNombre');
const pantallaChat = document.getElementById('pantallaChat');
const inputNombre = document.getElementById('nombre');
const botonEntrar = document.getElementById('botonEntrar');
const listaUsuarios = document.getElementById('listaUsuarios');
const tituloChat = document.getElementById('tituloChat');
const mensajes = document.getElementById('mensajes');
const formularioMensaje = document.getElementById('formularioMensaje');
const inputMensaje = document.getElementById('mensaje');

// Datos del usuario y de la conexión
let miNombre = '';
let usuarioSeleccionado = '';
let usuarioSeleccionadoNombre = '';
let peer = null;

// Entrar al chat
botonEntrar.addEventListener('click', function() {
    const nombre = inputNombre.value.trim();

    if (nombre === '') {
        alert('Escribe tu nombre para entrar.');
        return;
    }

    miNombre = nombre;

    pantallaNombre.hidden = true;
    pantallaChat.hidden = false;

    socket.emit('entrar', miNombre);
});

// Mostrar los usuarios conectados
socket.on('usuarios', function(usuarios) {
    listaUsuarios.innerHTML = '';

    usuarios.forEach(function(usuario) {
        const elemento = document.createElement('li');

        if (usuario.id === socket.id) {
            elemento.textContent = usuario.nombre + ' (tú)';
        } else {
            const boton = document.createElement('button');

            boton.textContent = usuario.nombre;
            boton.addEventListener('click', function() {
                iniciarChat(usuario.id, usuario.nombre);
            });

            elemento.appendChild(boton);
        }

        listaUsuarios.appendChild(elemento);
    });
});

// Iniciar un chat con otro usuario
function iniciarChat(id, nombre) {
    if (peer) {
        peer.destroy();
    }

    usuarioSeleccionado = id;
    usuarioSeleccionadoNombre = nombre;
    tituloChat.textContent = 'Chat con ' + nombre;
    mensajes.innerHTML = '';

    // Creamos la conexión como iniciador
    crearConexion(true);

    // Avisamos al otro usuario
    socket.emit('iniciar_chat', {
        destino: id,
        nombre: miNombre
    });
}

// Crear la conexión WebRTC
function crearConexion(esIniciador) {
    peer = new SimplePeer({
        initiator: esIniciador,
        trickle: false
    });

    peer.on('signal', function(senal) {
        socket.emit('senal', {
            destino: usuarioSeleccionado,
            senal: senal
        });
    });

    peer.on('connect', function() {
        tituloChat.textContent = 'Conectado mediante P2P';
    });

    peer.on('data', function(datos) {
        mostrarMensaje(usuarioSeleccionadoNombre, datos.toString());
    });

    peer.on('error', function(error) {
        console.error('Error WebRTC:', error);
    });
}

// Recibir una solicitud de chat
socket.on('iniciar_chat', function(datos) {
    if (peer) {
        peer.destroy();
    }

    usuarioSeleccionado = datos.origen;
    usuarioSeleccionadoNombre = datos.nombre;
    tituloChat.textContent = 'Chat con ' + datos.nombre;
    mensajes.innerHTML = '';

    // Creamos la conexión como receptor
    crearConexion(false);
});

// Recibir la señalización del otro navegador
socket.on('senal', function(datos) {
    if (peer && datos.origen === usuarioSeleccionado) {
        peer.signal(datos.senal);
    }
});

// Enviar mensajes
formularioMensaje.addEventListener('submit', function(evento) {
    evento.preventDefault();

    const texto = inputMensaje.value.trim();

    if (texto === '') {
        return;
    }

    if (peer && peer.connected) {
        peer.send(texto);
        mostrarMensaje('Tú', texto);
        inputMensaje.value = '';
    } else {
        alert('Todavía no hay una conexión P2P establecida.');
    }
});

// Mostrar un mensaje en pantalla
function mostrarMensaje(remitente, texto) {
    const parrafo = document.createElement('p');
    parrafo.textContent = remitente + ': ' + texto;
    mensajes.appendChild(parrafo);
}