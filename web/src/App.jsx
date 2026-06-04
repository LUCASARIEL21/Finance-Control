import RoutesApp from './routes';
import { ToastProvider } from './components/ToastProvider';
import AssistantWidget from './components/AssistantWidget';
import { useLocation } from 'react-router-dom';

function App() {
  const location = useLocation();
  const hiddenAssistantRoutes = ['/resetar-senha', '/esqueceu-senha'];
  const shouldShowAssistant = !hiddenAssistantRoutes.includes(location.pathname);

  return (
    <ToastProvider>
      <RoutesApp />
      {shouldShowAssistant && <AssistantWidget />}
    </ToastProvider>
  );
}

export default App;