import logo from './logo.svg';
import './App.css';
import MemoryManager from './memoryManager';

function App() {
  const mm = new MemoryManager( 40, 2 )
  mm.requestMemory("P1", 6)
  mm.print()

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
