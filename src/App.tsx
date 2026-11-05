import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { ChooseOccasion } from './screens/ChooseOccasion';
import { EditorScreen } from './screens/editor/EditorScreen';
import { Home } from './screens/Home';
import { Personalise } from './screens/Personalise';
import { PhotosScreen } from './screens/PhotosScreen';
import { PlanScreen } from './screens/PlanScreen';
import { ProjectLayout } from './screens/ProjectLayout';
import { StyleScreen } from './screens/StyleScreen';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * HashRouter keeps every route inside index.html (…/#/album/123), so the app
 * works on GitHub Pages under any sub-path without server rewrites.
 */
export function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<ChooseOccasion />} />
        <Route path="/new/:occasionId" element={<Personalise />} />
        <Route path="/album/:id" element={<ProjectLayout />}>
          <Route index element={<Navigate to="album" replace />} />
          <Route path="details" element={<Personalise edit />} />
          <Route path="plan" element={<PlanScreen />} />
          <Route path="photos" element={<PhotosScreen />} />
          <Route path="style" element={<StyleScreen />} />
          <Route path="album" element={<EditorScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
