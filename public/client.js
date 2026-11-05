
const socket = io();

const pantallaNombre = document.getElementById('pantallaNombre');
const pantallaChat = document.getElementById('pantallaChat');
const inputNombre = document.getElementById('nombre');
const botonEntrar = document.getElementById('botonEntrar');
const listaUsuarios = document.getElementById('listaUsuarios');
const tituloChat = document.getElementById('tituloChat');
const mensajes = document.getElementById('mensajes');
const formularioMensaje = document.getElementById('formularioMensaje');
const inputMensaje = document.getElementById('mensaje');
const botonCompartir = document.getElementById('botonCompartir');
const botonDetener = document.getElementById('botonDetener');
const videoRemoto = document.getElementById('videoRemoto');

let miNombre = '';
let usuarioSeleccionado = '';
let usuarioSeleccionadoNombre = '';
let peer = null;
let streamPantalla = null;

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

    if (usuarioSeleccionado !== '') {
        const usuarioExiste = usuarios.some(function(usuario) {
            return usuario.id === usuarioSeleccionado;
        });

        if (!usuarioExiste) {
            detenerComparticion();

            if (peer) {
                peer.destroy();
                peer = null;
            }

            alert(usuarioSeleccionadoNombre + ' se ha desconectado.');

            usuarioSeleccionado = '';
            usuarioSeleccionadoNombre = '';
            mensajes.innerHTML = '';
            videoRemoto.srcObject = null;
            videoRemoto.hidden = true;
            tituloChat.textContent = 'Selecciona un usuario';
            botonCompartir.disabled = true;
        }
    }
});

function iniciarChat(id, nombre) {
    detenerComparticion();

    if (peer) {
        peer.destroy();
    }

    usuarioSeleccionado = id;
    usuarioSeleccionadoNombre = nombre;
    tituloChat.textContent = 'Chat con ' + nombre;
    mensajes.innerHTML = '';
    videoRemoto.srcObject = null;
    videoRemoto.hidden = true;
    botonCompartir.disabled = true;

    crearConexion(true);

    socket.emit('iniciar_chat', {
        destino: id,
        nombre: miNombre
    });
}

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
        botonCompartir.disabled = false;
    });

    peer.on('data', function(datos) {
        mostrarMensaje(usuarioSeleccionadoNombre, datos.toString());
    });

    peer.on('stream', function(stream) {
        videoRemoto.srcObject = stream;
        videoRemoto.hidden = false;
        videoRemoto.play().catch(function(error) {
            console.log(error);
        });
    });

    peer.on('error', function(error) {
        console.error('Error WebRTC:', error);
    });

    peer.on('close', function() {
        botonCompartir.disabled = true;
        botonDetener.disabled = true;
    });
}

socket.on('iniciar_chat', function(datos) {
    detenerComparticion();

    if (peer) {
        peer.destroy();
    }

    usuarioSeleccionado = datos.origen;
    usuarioSeleccionadoNombre = datos.nombre;
    tituloChat.textContent = 'Chat con ' + datos.nombre;
    mensajes.innerHTML = '';
    videoRemoto.srcObject = null;
    videoRemoto.hidden = true;
    botonCompartir.disabled = true;

    crearConexion(false);
});

socket.on('senal', function(datos) {
    if (peer && datos.origen === usuarioSeleccionado) {
        peer.signal(datos.senal);
    }
});

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

function mostrarMensaje(remitente, texto) {
    const parrafo = document.createElement('p');
    parrafo.textContent = remitente + ': ' + texto;
    mensajes.appendChild(parrafo);
}

botonCompartir.addEventListener('click', async function() {
    try {
        streamPantalla = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false
        });

        if (peer && peer.connected) {
            peer.addStream(streamPantalla);
            botonCompartir.disabled = true;
            botonDetener.disabled = false;

            const pista = streamPantalla.getVideoTracks()[0];

            pista.addEventListener('ended', function() {
                detenerComparticion();
            });
        }
    } catch (error) {
        console.log('No se ha podido compartir la pantalla:', error);
    }
});

botonDetener.addEventListener('click', function() {
    detenerComparticion();
});

function detenerComparticion() {
    if (streamPantalla) {
        const stream = streamPantalla;
        streamPantalla = null;

        if (peer && peer.connected) {
            peer.removeStream(stream);
        }

        stream.getTracks().forEach(function(pista) {
            pista.stop();
        });
    }

    botonDetener.disabled = true;

    if (peer && peer.connected) {
        botonCompartir.disabled = false;
    }
}
