import './index.css';
import './app';

export interface IElectronAPI {
    beep: () => Promise<void>;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
