import { cleanEnv, str, port } from 'envalid';

function validateEnv() {
    cleanEnv(process.env, {
        POSTGRES_HOST: str(),
        POSTGRES_PORT: port(),
        POSTGRES_USER: str(),
        POSTGRES_PASSWORD: str(),
        POSTGRES_DB: str(),
        DATABASE_URL: str(),
        PORT: port(),
        JWT_SECRET: str(),
    });
}

export { validateEnv };
