from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Employee Management System"
    
    # Database
    MONGO_URI: str
    MONGO_DB_NAME: str

    # JWT
    JWT_SECRET_KEY: str
    JWT_REFRESH_SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    
    # AI Service
    GROQ_API_KEY: str
    GROQ_MODEL: str


    class Config:
        env_file = ".env"

settings = Settings()