const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Le serveur distribue les fichiers du dossier actuel (où on mettra notre jeu)
app.use(express.static(__dirname));

// Stockage des salons actifs
const rooms = {};

io.on('connection', (socket) => {
    console.log('Nouveau joueur connecté:', socket.id);

    // 1. Le joueur veut créer un salon
    socket.on('createRoom', () => {
        // On génère un code à 4 chiffres (ex: 4852)
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        rooms[roomCode] = {
            player1: socket.id,
            player2: null
        };
        
        socket.join(roomCode);
        socket.emit('roomCreated', roomCode); // On envoie le code au créateur
        console.log(`Salon ${roomCode} créé par ${socket.id}`);
    });

    // 2. Le joueur 2 veut rejoindre un salon
    socket.on('joinRoom', (roomCode) => {
        if (rooms[roomCode]) {
            if (!rooms[roomCode].player2) {
                // Le salon existe et il y a de la place
                rooms[roomCode].player2 = socket.id;
                socket.join(roomCode);
                
                // On prévient le J2 qu'il a réussi à rentrer
                socket.emit('roomJoined', roomCode);
                
                // On dit aux DEUX joueurs que la partie peut commencer !
                io.to(roomCode).emit('startGame', {
                    message: "Les deux joueurs sont connectés ! PRÊTS ?"
                });
                console.log(`${socket.id} a rejoint le salon ${roomCode}`);
            } else {
                socket.emit('roomError', "Ce salon est déjà plein !");
            }
        } else {
            socket.emit('roomError', "Ce salon n'existe pas !");
        }
    });

    // 3. Relais des touches pressées
    // Quand un joueur appuie sur une touche, on la renvoie uniquement à son adversaire dans le même salon
    socket.on('playerAction', (data) => {
        // data contient : { roomCode: '1234', action: 'punch' }
        socket.to(data.roomCode).emit('opponentAction', data.action);
    });

    // 4. Déconnexion
    socket.on('disconnect', () => {
        console.log('Joueur déconnecté:', socket.id);
        // Ici, il faudrait chercher dans quel salon il était pour annuler la partie
    });
});

http.listen(3000, () => {
    console.log('Serveur prêt pour le jeu de combat ! Port: 3000');
});