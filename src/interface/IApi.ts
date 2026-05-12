export interface IApi {
    database_api_url: string;
}

export const api_url: IApi = {
    database_api_url: import.meta.env.VITE_PYTHON_DATABASE_API_URL || 'http://localhost:8000'
};
