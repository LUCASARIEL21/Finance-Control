import { Routes, Route } from 'react-router-dom';
import Home from '../pages/home';
import Login from '../pages/login';
import EsqueceuSenha from '../pages/esqueceuSenha';
import ResetarSenha from '../pages/resetarSenha';
import Perfil from '../pages/perfil';
import Transacoes from '../pages/transacoes';
import Dashboard from '../pages/dashboard';
import Relatorios from '../pages/relatorios';
import Investimentos from '../pages/investimentos';
import Calculadora from '../pages/calculadora';
import ImpostoRenda from '../pages/impostoRenda';

function RoutesApp() {
  return (
    <Routes>
      <Route path='/' element={<Login />} />
      <Route path='/esqueceu-senha' element={<EsqueceuSenha />} />
      <Route path='/resetar-senha' element={<ResetarSenha />} />
      <Route path='/home' element={<Home />} />
      <Route path='/transacoes' element={<Transacoes />} />
      <Route path='/dashboard' element={<Dashboard />} />
      <Route path='/relatorios' element={<Relatorios />} />
      <Route path='/investimentos' element={<Investimentos />} />
      <Route path='/calculadora' element={<Calculadora />} />
      <Route path='/imposto-renda' element={<ImpostoRenda />} />
      <Route path='/perfil' element={<Perfil />} />
    </Routes>
  );
}

export default RoutesApp;