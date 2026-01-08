# Ear Biometric Desktop Application

## Prerequisites

Make sure you have the following installed on your system:

* **Node.js** (LTS recommended)
* **npm** or **yarn**
* **Python** (recommended Python 3.9+)

---

## 1. Install Dependencies

### Node.js Dependencies

Install all Node.js dependencies defined in `package.json`:

```bash
npm install
# or
yarn install
```

### Python Packages

Install required Python packages (use a virtual environment if possible):

```bash
pip install -r requirements.txt
```

If you are using a virtual environment, activate it before installing packages.

---

## 2. Environment Variables Setup

### Create `.env` File

Create a `.env` file at the root of the project and define the following variables:

```env
VITE_PATH_CAMERAPY=path/to/camera.py
VITE_PATH_PYTHON_ENV=path/to/python/env
VITE_RGB_FOLDER=path/to/rgb_folder
VITE_DEPTH_FOLDER=path/to/depth_folder
VITE_PLY_FOLDER=path/to/ply_folder
VITE_EMBED_FOLDER=path/to/embed_folder
VITE_CHILD_MODEL=path/to/child_model
VITE_MOM_MODEL=path/to/mom_model
VITE_YOLO_MODEL=path/to/yolo_model
VITE_DATABASE_PORT=database-port
```

> **Note:**
>
> * All variables that need to be accessible in the Vite / Electron renderer process **must be prefixed with `VITE_`**.

### Update `forge.env.d.ts`

If you add **new environment variables**, you must also declare them in:

```
forge.env.d.ts
```

Example:

```ts
interface ImportMetaEnv {
  readonly VITE_PATH_CAMERAPY: string
  readonly VITE_PATH_PYTHON_ENV: string
  readonly VITE_RGB_FOLDER: string
  readonly VITE_DEPTH_FOLDER: string
  readonly VITE_PLY_FOLDER: string
  readonly VITE_EMBED_FOLDER: string
  readonly VITE_CHILD_MODEL: string
  readonly VITE_MOM_MODEL: string
  readonly VITE_YOLO_MODEL: string
  readonly VITE_DATABASE_PORT: number
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

Failing to update this file will result in TypeScript errors.

---

## 3. Accessing Environment Variables

### In TypeScript (Vite / Electron Renderer)

Use `import.meta.env`:

```ts
const cameraPath = import.meta.env.VITE_PATH_CAMERAPY
```

### In Python

Use `os.getenv`:

```python
import os

camera_path = os.getenv("VITE_PATH_CAMERAPY")
```

Make sure the environment variables are available to the Python process when it is spawned from Electron.

---

## 4. Running the Electron Forge Project

### Start Development Mode

```bash
npm run start
```

This will:

* Start the Vite dev server
* Launch the Electron application in development mode

---

### Package the Application

```bash
npm run package
```

Creates a packaged version of the application for your platform.

---

### Make Distributables

```bash
npm run make
```

Generates platform-specific installers (e.g., `.exe`, `.dmg`, `.deb`).

---

## Notes

* Always restart the Electron app after changing `.env` values.
* Ensure Python paths are correct and executable.
* Keep `.env` out of version control (add it to `.gitignore`).

---

Happy coding 🚀

---

# Program Overview

### Identify Patient Page

<img width="984" height="614" alt="image" src="https://github.com/user-attachments/assets/a367d3ff-009a-4199-8d02-5592c7c17c00" />

Identify patient ear using deep learning model ViT-16 and custom embedding layer.

### Registry Page

<img width="825" height="514" alt="image" src="https://github.com/user-attachments/assets/75a0476c-61ba-4433-bfab-725fb775c309" />

Registry page for getting patient record then store into our database

### Update Page

<img width="825" height="515" alt="image" src="https://github.com/user-attachments/assets/fa7a9e7f-54ed-4a2a-b7e4-cb28cec88a99" />

Update patient ear embedding vector or create one

### Delete Page

<img width="829" height="517" alt="image" src="https://github.com/user-attachments/assets/807f2722-d7f5-4fbb-a489-5276d1afd6ad" />

Delte patient recoed having hard delete and also soft delete

### Record Page

<img width="828" height="517" alt="image" src="https://github.com/user-attachments/assets/4f6c56a4-1220-4ad1-9a96-7ba9064a4555" />

Record page for quering patient records and look for patient relation between parent and child

### Edit Record Page

<img width="826" height="517" alt="image" src="https://github.com/user-attachments/assets/3f420e72-c904-4314-9754-0c26b0822d06" />

Query and edit patient record
