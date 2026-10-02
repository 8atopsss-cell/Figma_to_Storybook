import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from './index';
import './styles/global.css';

function Example() {
  const [count, setCount] = useState(0);
  return <main data-theme="light" style={{ padding: 32, minHeight: '100vh', background: 'var(--surface-page)' }}>
    <h1>Пример вне Storybook</h1>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      <Button onClick={() => setCount(count + 1)}>Сохранить</Button>
      <Button variant="secondary">Отмена</Button>
      <Button variant="danger" disabled>Удалить</Button>
    </div>
    <p role="status">Действий: {count}</p>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Example />);
