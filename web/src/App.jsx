import RoutesApp from './routes';
import { ToastProvider } from './components/ToastProvider';
import AssistantWidget from './components/AssistantWidget';

function App() {
  return (
    <ToastProvider>
      <RoutesApp />
      <AssistantWidget />
    </ToastProvider>
  );
}

export default App;