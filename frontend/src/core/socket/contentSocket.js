import { io } from 'socket.io-client';
import { getSocketUrl } from '../../utils/apiConfig';

let contentSocket = null;

export const getContentSocket = () => {
  if (contentSocket) return contentSocket;

  contentSocket = io(getSocketUrl(), {
    autoConnect: true,
    withCredentials: true,
    transports: ['websocket', 'polling'],
    auth: { role: 'public-content' },
  });

  return contentSocket;
};

export const disconnectContentSocket = () => {
  if (contentSocket) {
    contentSocket.disconnect();
    contentSocket = null;
  }
};
