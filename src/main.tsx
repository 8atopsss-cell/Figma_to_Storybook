import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AddIcon, Button } from './index';
import './styles/global.css';
function App() {
  const [clicks, setClicks] = useState(0);
  return <main className="demo-surface" data-theme="light"><h1 className="demo-title">Button вне Storybook</h1>
    <Button startIcon={<AddIcon />} onClick={() => setClicks(value => value + 1)}>Добавить</Button>
    <output className="demo-count" aria-live="polite">Нажатий: {clicks}</output>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App />);
