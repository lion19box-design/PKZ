import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import db from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logEvent } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем базу вопросов
const questionsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions.json'), 'utf-8'));
const blackBoxQuestions = JSON.parse(fs.readFileSync(path.join(__dirname, 'bb_questions.json'), 'utf-8'));

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Для разработки
    methods: ['GET', 'POST']
  }
});

// Хранилище состояния комнат в памяти (пока не требуется постоянное хранение игры)
const rooms = new Map();
// Хранилище таймаутов таймеров отдельно от комнат (чтобы не нарушать сериализацию socket.io)
const roomTimers = new Map();

function clearRoomTimer(roomId) {
  if (roomTimers.has(roomId)) {
    clearTimeout(roomTimers.get(roomId));
    roomTimers.delete(roomId);
  }
}

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Заполните все поля' });

  try {
    const hash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    const info = stmt.run(username, hash);
    res.json({ success: true, id: info.lastInsertRowid });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Пользователь уже существует' });
    } else {
      res.status(500).json({ error: 'Внутренняя ошибка' });
    }
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (user && bcrypt.compareSync(password, user.password_hash)) {
      res.json({ success: true, username: user.username, stats: { played: user.games_played, wins: user.wins }});
    } else {
      res.status(401).json({ error: 'Неверный логин или пароль' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка' });
  }
});

app.get('/api/music', (req, res) => {
  const musicDir = path.join(__dirname, '../public/assets/audio/project-music');
  try {
    const files = fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3'));
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read music directory' });
  }
});

// Функция для проверки наград (сов)
const evaluateAwards = (wins) => {
  const newAwards = [];
  if (wins === 1) newAwards.push(1); // Order of Crystal
  if (wins === 3) newAwards.push(3); // Crystal Owl
  if (wins === 5) newAwards.push(5); // Order of Diamond
  if (wins === 10) newAwards.push(10); // Diamond Owl
  return newAwards;
};

app.get('/api/profile/:username', (req, res) => {
  const { username } = req.params;
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (user) {
      res.json({ 
        success: true, 
        profile: {
          games_played: user.games_played,
          wins: user.wins,
          losses: user.losses,
          penalties: user.penalties,
          active_avatar: user.active_avatar,
          active_hat: user.active_hat,
          unlocked_hats: JSON.parse(user.unlocked_hats || '[]'),
          unlocked_owls: JSON.parse(user.unlocked_owls || '[]'),
          pending_awards: JSON.parse(user.pending_awards || '[]')
        }
      });
    } else {
      res.status(404).json({ error: 'Пользователь не найден' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка' });
  }
});

app.post('/api/profile/equip', (req, res) => {
  const { username, type, itemId } = req.body;
  try {
    if (type === 'avatar') {
      db.prepare('UPDATE users SET active_avatar = ? WHERE username = ?').run(itemId, username);
    } else if (type === 'hat') {
      db.prepare('UPDATE users SET active_hat = ? WHERE username = ?').run(itemId, username);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка' });
  }
});

app.post('/api/profile/claim-award', (req, res) => {
  const { username, awardId } = req.body;
  try {
    const user = db.prepare('SELECT unlocked_owls, pending_awards FROM users WHERE username = ?').get(username);
    if (user) {
      let pending = JSON.parse(user.pending_awards || '[]');
      let unlocked = JSON.parse(user.unlocked_owls || '[]');
      
      if (pending.includes(awardId)) {
        pending = pending.filter(id => id !== awardId);
        if (!unlocked.includes(awardId)) unlocked.push(awardId);
        
        db.prepare('UPDATE users SET pending_awards = ?, unlocked_owls = ? WHERE username = ?')
          .run(JSON.stringify(pending), JSON.stringify(unlocked), username);
          
        res.json({ success: true, pending, unlocked });
      } else {
        res.status(400).json({ error: 'Награда не найдена в ожидающих' });
      }
    }
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка' });
  }
});

// Socket.io логика
io.on('connection', (socket) => {
  logEvent('info', null, `User connected: ${socket.id}`);

  socket.on('createRoom', (data, callback) => {
    const roomId = Math.floor(1000 + Math.random() * 9000).toString();
    rooms.set(roomId, {
      id: roomId,
      host: socket.id,
      players: [],
      score: { experts: 0, viewers: 0 },
      state: 'waiting', // waiting, playing, finished
      playedQuestionsIds: [],
      gameQuestions: [],
      currentQuestion: null,
      targetSector: null,
      playedSectors: [],
      blackBoxState: 'hidden',
      triumphDeclaredBy: null,
      timerPenalty: false,
      timerEndsAt: null,
      timerSpent: false,
      hints: { credit: false, club: false, host: false },

    });
    socket.join(roomId);
    callback({ roomId });
  });

  socket.on('joinRoom', ({ roomId, username, isHost }, callback) => {
    const room = rooms.get(roomId);
    if (room) {
      if (!isHost && room.hostUsername === username) {
         isHost = true;
      }
      
      if (!isHost) {
        // Загружаем аватар и шапку из БД
        let active_avatar = 'avatar_boss.jpg';
        let active_hat = null;
        try {
          const user = db.prepare('SELECT active_avatar, active_hat FROM users WHERE username = ?').get(username);
          if (user) {
            active_avatar = user.active_avatar || 'avatar_boss.jpg';
            active_hat = user.active_hat;
          }
        } catch (e) {
          console.error(e);
        }

        if (room.hostUsername === username) {
           callback({ success: false, error: 'Крупье не может быть знатоком в своей игре' });
           return;
        }

        if (room.bannedUsers && room.bannedUsers[username] && (Date.now() - room.bannedUsers[username] < 30 * 1000)) {
           callback({ success: false, error: 'Господин крупье постановил не пущать. Подождите 30 секунд.' });
           return;
        }

        // Проверяем, нет ли уже такого игрока (реконнект)
        const existingPlayer = room.players.find(p => p.username === username);
        if (existingPlayer) {
          existingPlayer.id = socket.id;
          existingPlayer.active_avatar = active_avatar;
          existingPlayer.active_hat = active_hat;
          socket.join(roomId);
          io.to(roomId).emit('roomUpdated', room);
          callback({ success: true, room });
        } else {
          if (room.state !== 'waiting') {
            if (!room.joinRequests) room.joinRequests = [];
            const req = room.joinRequests.find(r => r.username === username);
            if (req) {
               req.id = socket.id;
            } else {
               room.joinRequests.push({ id: socket.id, username, active_avatar, active_hat });
               // Notify the host (and optionally everyone) about the new knock
               const isTimerActive = room.timerEndsAt && room.timerEndsAt > Date.now();
               io.to(room.host).emit('joinRequestNotification', { isTimerActive, username });
               if (isTimerActive) {
                   io.to(room.host).emit('playAudioGlobal', 'znatok-wants-to-join');
               } else {
                   io.to(roomId).emit('playAudioGlobal', 'znatok-wants-to-join');
               }
            }
            socket.join(roomId);
            io.to(roomId).emit('roomUpdated', room);
            callback({ success: true, status: 'pending', room });
          } else {
            room.players.push({ id: socket.id, username, ready: false, active_avatar, active_hat });
            socket.join(roomId);
            io.to(roomId).emit('roomUpdated', room);
            callback({ success: true, room });
          }
        }
      } else {
        if (room.hostUsername && room.hostUsername !== username && room.host) {
           callback({ success: false, error: 'В этой комнате уже есть Крупье' });
           return;
        }
        room.host = socket.id;
        room.hostUsername = username;
        socket.join(roomId);
        io.to(roomId).emit('roomUpdated', room);
        callback({ success: true, room, isHost: true });
      }
    } else {
      callback({ success: false, error: 'Комната не найдена' });
    }
  });

  socket.on('toggleReady', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.ready = !player.ready;
        io.to(roomId).emit('roomUpdated', room);
      }
    }
  });

  socket.on('declareTriumph', ({ roomId, username }) => {
    const room = rooms.get(roomId);
    if (room) {
      if (!room.triumphDeclaredBy) room.triumphDeclaredBy = [];
      if (!room.triumphDeclaredBy.includes(username)) {
        room.triumphDeclaredBy.push(username);
        io.to(roomId).emit('roomUpdated', room);
        io.to(roomId).emit('playAudioGlobal', 'hey-triumph');
      }
    }
  });

  socket.on('updatePlayedQuestions', ({ roomId, playedQuestionsText }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {
      const ids = playedQuestionsText.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      room.playedQuestionsIds = ids;
      io.to(roomId).emit('roomUpdated', room);
    }
  });

  socket.on('startGame', ({ roomId }, callback) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {
      const availableQuestions = questionsData.filter(q => !room.playedQuestionsIds.includes(q.id));
      
      if (availableQuestions.length < 13) {
         if (callback) callback({ success: false, error: `Недостаточно несыгранных вопросов. Доступно: ${availableQuestions.length}, нужно: 13.` });
         return;
      }
      
      // Fisher-Yates shuffle
      const shuffled = [...availableQuestions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      const randomBB = blackBoxQuestions[Math.floor(Math.random() * blackBoxQuestions.length)];
      room.gameQuestions = [randomBB, ...shuffled.slice(0, 12)];
      room.state = 'playing';
      room.blackBoxState = 'hidden';
      
      logEvent('game', roomId, 'Game started', { 
          host: socket.id, 
          viewersCount: room.players.length,
          questions: room.gameQuestions.map(q => q.id)
      });
      
      io.to(roomId).emit('roomUpdated', room);
      io.to(roomId).emit('playAudioGlobal', 'start-bg-music');
      if (callback) callback({ success: true });
    }
  });

  socket.on('spinRoulette', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {
      // Ищем несыгранные сектора (0-12)
      const availableSectors = [];
      for (let i = 0; i < 13; i++) {
        if (!room.playedSectors.includes(i) && room.gameQuestions[i]) {
          // Запрет нулевого сектора в первом и финальном раундах
          if (room.playedSectors.length === 0 && i === 0) continue;
          if (room.score.experts === 5 && room.score.viewers === 5 && i === 0) continue;
          availableSectors.push(i);
        }
      }
      if (availableSectors.length > 0) {
        const randomSector = availableSectors[Math.floor(Math.random() * availableSectors.length)];
        room.targetSector = randomSector;

        
        logEvent('game', roomId, `Roulette spun, targeted sector ${randomSector}`);
        
        io.to(roomId).emit('roomUpdated', room);
        io.to(roomId).emit('playAudioGlobal', 'pause-bg-music');
        io.to(roomId).emit('playAudioGlobal', 'roulette-sound-with-result');
        setTimeout(() => {
          const r = rooms.get(roomId);
          if (r && !r.timerEndsAt) {
            io.to(roomId).emit('playAudioGlobal', 'resume-bg-music');
          }
        }, 9000);
      }
    }
  });

  socket.on('showBlackBox', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {

      room.blackBoxState = 'closed';
      io.to(roomId).emit('roomUpdated', room);
    }
  });

  socket.on('openBlackBox', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {

      room.blackBoxState = 'opened';
      io.to(roomId).emit('roomUpdated', room);
      io.to(roomId).emit('playAudioGlobal', 'gong');
    }
  });

  socket.on('endBlackBox', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {

      room.blackBoxState = 'hidden';
      io.to(roomId).emit('roomUpdated', room);
    }
  });

  socket.on('updateBoxOffset', ({ roomId, offset }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {
      room.boxOffsetY = offset;
      io.to(roomId).emit('roomUpdated', room);
    }
  });

  socket.on('setQuestion', ({ roomId, sectorIndex }) => {
      const room = rooms.get(roomId);
      if (room && socket.id === room.host) {
          room.currentQuestion = room.gameQuestions[sectorIndex];
          if(!room.playedSectors.includes(sectorIndex)){
             room.playedSectors.push(sectorIndex);
             logEvent('game', roomId, `Question opened: Sector ${sectorIndex}`, { questionId: room.currentQuestion.id });
          }
          io.to(roomId).emit('roomUpdated', room);
      }
  });

  socket.on('startTimer', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {
      if (room.timerEndsAt) return;
      const duration = room.timerPenalty ? 40 : 60;

      room.timerEndsAt = Date.now() + duration * 1000;
      room.timerSpent = false;
      
      clearRoomTimer(roomId);
      const timeout = setTimeout(() => {
        const r = rooms.get(roomId);
        if (r && r.timerEndsAt) {
          r.timerSpent = true;
          r.timerEndsAt = null;
          roomTimers.delete(roomId);
          io.to(roomId).emit('timerStopped');
          io.to(roomId).emit('playAudioGlobal', 'resume-bg-music');
          io.to(roomId).emit('roomUpdated', r);
        }
      }, duration * 1000);
      roomTimers.set(roomId, timeout);

      io.to(roomId).emit('timerStarted', { timerEndsAt: room.timerEndsAt });
      io.to(roomId).emit('playAudioGlobal', 'pause-bg-music');
      io.to(roomId).emit('playAudioGlobal', 'gong');
      io.to(roomId).emit('roomUpdated', room);
    }
  });

  socket.on('stopTimer', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {
      room.timerEndsAt = null;
      room.timerSpent = true;
      clearRoomTimer(roomId);
      io.to(roomId).emit('timerStopped');
      io.to(roomId).emit('playAudioGlobal', 'minute-finished-beep');
      io.to(roomId).emit('playAudioGlobal', 'resume-bg-music');
      io.to(roomId).emit('roomUpdated', room);
    }
  });

  socket.on('applyPenalty', ({ roomId, targetUsername, penaltyType }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {
      if (penaltyType === 'time') {
        room.timerPenalty = true;
      } else {
        const player = room.players.find(p => p.username === targetUsername);
        if (player) {
          if (penaltyType === 'remove_1_round') {
            player.removedForRound = true;
          } else if (penaltyType === 'remove_hat') {
            player.lostHat = true;
          }
        }
      }
      io.to(roomId).emit('roomUpdated', room);
      io.to(roomId).emit('penaltyApplied', { targetUsername, penaltyType });
      io.to(roomId).emit('playAudioGlobal', 'penalty-applied-to-znatok');
    }
  });

  socket.on('activateHint', ({ roomId, hintType }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {
      if (room.score.experts === 5 && room.score.viewers === 5 && hintType !== 'credit') {
         return; // В финальном раунде можно брать только минуту в кредит
      }
      room.hints[hintType] = true;

      io.to(roomId).emit('roomUpdated', room);
      io.to(roomId).emit('hintActivated', hintType);
      io.to(roomId).emit('playAudioGlobal', 'hint-appears');
    }
  });

  socket.on('adjustScore', ({ roomId, team, delta }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {
      room.score[team] = Math.max(0, room.score[team] + delta);
      // Сброс штрафов, действующих 1 раунд
      room.timerPenalty = false;
      room.timerEndsAt = null;
      room.timerSpent = false;
      clearRoomTimer(roomId);
      room.currentQuestion = null;
      room.targetSector = null;
      room.blackBoxState = 'hidden';
      
      room.players.forEach(p => {
        if (p.removedForRound) p.removedForRound = false;
      });

      
      logEvent('game', roomId, `Score adjusted: ${team} ${delta > 0 ? '+' : ''}${delta}. New score: ${room.score.experts}:${room.score.viewers}`);
      
      io.to(roomId).emit('timerStopped');
      io.to(roomId).emit('roomUpdated', room);
      io.to(roomId).emit('playAudioGlobal', 'resume-bg-music');

      if (room.score.experts === 6 || room.score.viewers === 6) {
        const winSound = room.score.experts === 6 ? 'znatoki-won-game' : 'znatoki-lost-game';
        io.to(roomId).emit('playAudioGlobal', winSound);
        
        room.state = 'finished';
        io.to(roomId).emit('roomUpdated', room);

        // Обновляем статистику в БД для всех игроков
        const expertsWon = room.score.experts === 6;
        room.players.forEach(p => {
           try {
             const user = db.prepare('SELECT * FROM users WHERE username = ?').get(p.username);
             if (user) {
               let wins = user.wins;
               let losses = user.losses;
               let played = user.games_played + 1;
               
               if (expertsWon) {
                 wins++;
               } else {
                 losses++;
               }
               
               // Проверяем новые награды
               const newAwardsToUnlock = evaluateAwards(wins);
               let pending = JSON.parse(user.pending_awards || '[]');
               let unlocked = JSON.parse(user.unlocked_owls || '[]');
               
               newAwardsToUnlock.forEach(awardId => {
                 // Если награда не разблокирована и её еще нет в ожидающих
                 if (!unlocked.includes(awardId) && !pending.includes(awardId)) {
                   pending.push(awardId);
                 }
               });
               
               db.prepare('UPDATE users SET games_played = ?, wins = ?, losses = ?, pending_awards = ? WHERE username = ?')
                 .run(played, wins, losses, JSON.stringify(pending), p.username);
             }
            } catch(e) {
              console.error("DB Update error for user", p.username, e);
            }
         });
         
         setTimeout(() => {
            const r = rooms.get(roomId);
            if (r) {
                r.state = 'waiting';
                r.score = { experts: 0, viewers: 0 };
                r.playedQuestionsIds = [];
                r.gameQuestions = [];
                r.playedSectors = [];
                r.currentQuestion = null;
                r.targetSector = null;
                r.blackBoxState = 'hidden';
                r.timerEndsAt = null;
                r.timerPenalty = false;
                r.timerSpent = false;
                io.to(roomId).emit('roomUpdated', r);
            }
         }, 86000); // 86 секунд (длительность аудио znatoki-won-game 1:24 + 2 сек)

      } else {
        const roundSound = team === 'experts' && delta > 0 ? 'znatoki-won-round' : (team === 'viewers' && delta > 0 ? 'znatoki-lost-round' : null);
        if (roundSound) io.to(roomId).emit('playAudioGlobal', roundSound);

        if (room.score.experts === 5 && room.score.viewers === 5) {
          setTimeout(() => {
             io.to(roomId).emit('playAudioGlobal', 'final-round-incoming');
             io.to(roomId).emit('finalRoundIncoming');
          }, 3000);
        }
      }
    }
  });

  socket.on('cancelRound', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {
      if (room.targetSector !== null) {
          // Сектор остается в playedSectors (не выпадает дважды)
          room.targetSector = null;
      }
      room.currentQuestion = null;
      room.blackBoxState = 'hidden';
      room.canceledRounds = (room.canceledRounds || 0) + 1;
      room.timerEndsAt = null;
      room.timerSpent = false;
      room.timerPenalty = false;
      clearRoomTimer(roomId);
      
      logEvent('game', roomId, 'Round cancelled');
      
      io.to(roomId).emit('timerStopped');
      io.to(roomId).emit('playAudioGlobal', 'resume-bg-music');
      io.to(roomId).emit('roomUpdated', room);
    }
  });

  socket.on('finishGame', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {
      room.state = 'finished';
      room.timerEndsAt = null;
      room.timerSpent = false;
      clearRoomTimer(roomId);
      
      logEvent('game', roomId, 'Game finished');
      
      io.to(roomId).emit('timerStopped');
      io.to(roomId).emit('roomUpdated', room);
    }
  });


  socket.on('destroyRoom', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {
      clearRoomTimer(roomId);
      rooms.delete(roomId);
      io.to(roomId).emit('roomDestroyed');
    }
  });

  socket.on('leaveRoom', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.players = room.players.filter(p => p.id !== socket.id);
      io.to(roomId).emit('roomUpdated', room);
    }
  });

  socket.on('resolveJoinRequest', ({ roomId, username, action }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {
      if (!room.joinRequests) return;
      const reqIndex = room.joinRequests.findIndex(r => r.username === username);
      if (reqIndex !== -1) {
        const req = room.joinRequests.splice(reqIndex, 1)[0];
        if (action === 'accept') {
          if (room.players.length < 5) {
            room.players.push({ id: req.id, username: req.username, ready: true, active_avatar: req.active_avatar, active_hat: req.active_hat });
            io.to(req.id).emit('joinRequestApproved', room);
          }
        } else if (action === 'reject') {
          if (!room.bannedUsers) room.bannedUsers = {};
          room.bannedUsers[username] = Date.now();
          io.to(req.id).emit('joinRequestRejected');
        }
        io.to(roomId).emit('roomUpdated', room);
      }
    }
  });

  socket.on('playAudio', ({ roomId, audioName }) => {
      io.to(roomId).emit('playAudioGlobal', audioName);
  });

  socket.on('stopAudio', ({ roomId, audioName }) => {
      io.to(roomId).emit('stopAudioGlobal', audioName);
  });

  socket.on('kickPlayer', ({ roomId, username }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {
      const playerIndex = room.players.findIndex(p => p.username === username);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        if (!room.bannedUsers) room.bannedUsers = {};
        room.bannedUsers[username] = Date.now();
        io.to(player.id).emit('kickedOut');
        io.to(roomId).emit('roomUpdated', room);
      }
    }
  });

  socket.on('disconnect', () => {
    logEvent('info', null, `User disconnected: ${socket.id}`);
    for (const [roomId, room] of rooms.entries()) {
      if (room.state === 'waiting') {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          io.to(roomId).emit('roomUpdated', room);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
