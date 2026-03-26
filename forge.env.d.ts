/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

interface ImportMetaEnv {
    readonly VITE_PATH_CAMERAPY: string
    readonly VITE_PATH_PYTHON_ENV: string
    readonly VITE_RGB_FOLDER: string
    readonly VITE_DEPTH_FOLDER: string
    readonly VITE_PLY_FOLDER: string
    readonly VITE_EMBED_FOLDER: string
    // readonly VITE_CHILD_MODEL: string
    // readonly VITE_MOM_MODEL: string
    readonly VITE_YOLO_MODEL: string
    readonly VITE_YOLO_MODEL_DETECT: string
    readonly VITE_DATABASE_PORT: number
    readonly VITE_DEBUG_FOLDER: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
