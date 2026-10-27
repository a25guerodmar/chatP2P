const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const usuarios = [];

io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado:', socket.id);

    socket.on('entrar', (nombre) => {
        const usuario = {
            id: socket.id,
            nombre: nombre
        };

        usuarios.push(usuario);

        io.emit('usuarios', usuarios);

        console.log(nombre, 'se ha conectado');
    });
    socket.on('senal', function(datos) {
        io.to(datos.destino).emit('senal', {
            origen: socket.id,
            senal: datos.senal
        });
    });

    socket.on('iniciar_chat', function(datos) {
        io.to(datos.destino).emit('iniciar_chat', {
            origen: socket.id,
            nombre: datos.nombre
        });
    });

    socket.on('disconnect', () => {
        const indice = usuarios.findIndex(usuario => usuario.id === socket.id);

        if (indice !== -1) {
            console.log(usuarios[indice].nombre, 'se ha desconectado');
            usuarios.splice(indice, 1);
            io.emit('usuarios', usuarios);
        }
    });
});

const PORT = process.env.PORT || 40303;

server.listen(PORT, () => {
    console.log(`Servidor funcionando en el puerto ${PORT}`);
});