import React, { useState } from 'react';
import './Home.css'; // Reuse styles for consistency

const CORRECT_PASSCODE = 'TechPathAi24'; // Simple hardcoded passcode

function PasscodeAuth({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handlePasscodeChange = (e) => {
    setPasscode(e.target.value);
    setError(''); // Clear error on input change
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passcode === CORRECT_PASSCODE) {
      setIsAuthenticated(true);
    } else {
      setError('Incorrect passcode. Please try again.');
      setPasscode(''); // Clear the input field
    }
  };

  if (isAuthenticated) {
    return children; // Render the Home component if authenticated
  }

  return (
    <div className="passcode-container">
      <form onSubmit={handleSubmit} className="passcode-form">
        <h2>Enter Passcode</h2>
        <p>Please enter the passcode to access the TechpathAI rooms.</p>
        <input
          type="password"
          value={passcode}
          onChange={handlePasscodeChange}
          className="passcode-input"
          placeholder="Enter passcode"
          autoFocus
        />
        <button type="submit" className="passcode-submit-button">
          Enter
        </button>
        {error && <div className="error-message passcode-error">{error}</div>}
      </form>
    </div>
  );
}

export default PasscodeAuth; 