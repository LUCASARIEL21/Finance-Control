import { Routes, Route } from 'react-router-dom';
import Home from '../pages/home';
import Login from '../pages/login';
import Perfil from '../pages/perfil';

function RoutesApp() {
  return (
    <Routes>
      <Route path='/' element={<Login />} />
      <Route path='/home' element={<Home />} />
      <Route path='/perfil' element={<Perfil />} />
    </Routes>
  );
}

export default RoutesApp;