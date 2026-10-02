const fs = require('fs');
let s = fs.readFileSync('src/App.jsx', 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing ' + a); s = s.replace(a, b); };
rep("import React from 'react';", "import React, { Suspense, lazy } from 'react';");
rep("import Lobby from './components/Lobby';\n", '');
rep("import HostView from './components/HostView';\n", '');
rep("import ExpertView from './components/ExpertView';\n", '');
rep("import Profile from './components/Profile';\n", '');
rep("import InviteRedirect from './components/InviteRedirect';",
  "import InviteRedirect from './components/InviteRedirect';\n\n" +
  "// Игровые экраны грузятся по требованию: главному меню они не нужны\n" +
  "const Lobby = lazy(() => import('./components/Lobby'));\n" +
  "const HostView = lazy(() => import('./components/HostView'));\n" +
  "const ExpertView = lazy(() => import('./components/ExpertView'));\n" +
  "const Profile = lazy(() => import('./components/Profile'));");
rep('        <Routes>', '        <Suspense fallback={null}>\n        <Routes>');
rep('        </Routes>', '        </Routes>\n        </Suspense>');
fs.writeFileSync('src/App.jsx', s);
