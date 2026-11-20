import { BrowserRouter, Route, Routes } from 'react-router-dom';
import type { Api } from '../services/api';
import { Layout } from '../components/Layout';
import { Home } from '../pages/Home';
import { RoomPage } from '../pages/Room';
import { NotFound } from '../pages/NotFound';

export function App({ api }: { api: Api }) {
  return <BrowserRouter><Routes><Route element={<Layout />}>
    <Route path="/" element={<Home api={api} />} />
    <Route path="/sala/:hash" element={<RoomPage api={api} />} />
    <Route path="*" element={<NotFound />} />
  </Route></Routes></BrowserRouter>;
}
