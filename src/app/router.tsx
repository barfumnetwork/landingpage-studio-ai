import { Navigate, Route, Routes } from 'react-router-dom';
import { ProjectPlaceholderScreen } from './screens/ProjectPlaceholderScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { AppShell } from './shell/AppShell';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/project/:projectId" element={<ProjectPlaceholderScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
