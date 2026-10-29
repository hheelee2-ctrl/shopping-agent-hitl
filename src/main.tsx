import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Shell from './Shell';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './styles/app.css';
import './styles/landing.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
);
