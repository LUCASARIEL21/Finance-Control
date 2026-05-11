import RoutesApp from './routes';
import { ToastProvider } from './components/ToastProvider';

function App() {
  return (
    <ToastProvider>
      <RoutesApp />
    </ToastProvider>
  );
}

export default App;