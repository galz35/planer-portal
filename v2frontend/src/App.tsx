import { ErrorBoundary } from './components/ErrorBoundary';
import { AppProviders } from './components/providers/AppProviders';
import { AppRoutes } from './routes/AppRoutes';

function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
