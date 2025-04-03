import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

// Lazy load components
const Home = lazy(() => import('./Home'));
const Editor = lazy(() => import('./Editor'));
const PasscodeAuth = lazy(() => import('./PasscodeAuth'));

// Simple loading component (can be styled better)
const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    Loading...
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route
            path="/"
            element={
              <PasscodeAuth>
                <Home />
              </PasscodeAuth>
            }
          />
          <Route path="/editor/:roomName" element={<Editor />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
