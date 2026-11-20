import type { Dispatch, SetStateAction } from 'react';
import type { ConnectionStatus } from '../services/realtime';

export interface RoomChrome {
  name: string;
  connection: ConnectionStatus;
  cinema: boolean;
  invite: () => void;
  toggleCinema: () => void;
  settings: () => void;
}
export interface PageOutlet { setRoomChrome: Dispatch<SetStateAction<RoomChrome | null>> }
