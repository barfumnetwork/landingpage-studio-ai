import { Navigate, Route, Routes } from 'react-router-dom';
import { WizardScreen } from '../features/wizard/WizardScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { AppShell } from './shell/AppShell';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/project/:projectId" element={<WizardScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
