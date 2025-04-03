import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './Home';
import Editor from './Editor';
import PasscodeAuth from './PasscodeAuth';

function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;
