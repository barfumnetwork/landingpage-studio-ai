import { Navigate, Route, Routes } from 'react-router-dom';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ProjectScreen } from './screens/ProjectScreen';
import { SiteViewScreen } from './screens/SiteViewScreen';
import { AppShell } from './shell/AppShell';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/project/:projectId" element={<ProjectScreen />} />
        <Route path="/project/:projectId/view/:conceptId" element={<SiteViewScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
