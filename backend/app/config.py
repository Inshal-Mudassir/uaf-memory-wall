"""Application settings, loaded from environment variables (or a local .env file)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SALT = "dev-only-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"  # "development" | "production"

    # Database
    mongodb_uri: str = ""
    mongodb_db: str = "uaf_memory_wall"
    use_mock_db: bool = False  # in-memory database for local demos and tests only
    seed_demo_on_start: bool = False  # add labelled demo memories on startup (mock database only)

    # Image storage
    storage_backend: str = "cloudinary"  # "cloudinary" | "local" (local is for development only)
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    cloudinary_folder: str = "uaf-memory-wall"
    upload_dir: str = "uploads"
    public_base_url: str = "http://localhost:8000"

    # Web
    cors_origins: str = "http://localhost:5173"
    trust_proxy: bool = False  # true when running behind Render/Fly/Nginx so X-Forwarded-For is used

    # Security and moderation
    admin_api_key: str = ""
    secret_salt: str = DEFAULT_SALT
    blocked_words: str = ""  # comma separated
    report_hide_threshold: int = 3

    # Upload limits
    max_image_mb: int = 8
    max_images: int = 6

    # Rate limits: requests allowed per window (seconds), per visitor
    rate_post_limit: int = 5
    rate_post_window: int = 3600
    rate_comment_limit: int = 10
    rate_comment_window: int = 600
    rate_like_limit: int = 60
    rate_like_window: int = 600
    rate_report_limit: int = 10
    rate_report_window: int = 3600
    rate_read_limit: int = 240
    rate_read_window: int = 60
    rate_admin_limit: int = 30
    rate_admin_window: int = 60

    @property
    def cors_list(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]

    @property
    def blocked_list(self) -> list[str]:
        return [w.strip().lower() for w in self.blocked_words.split(",") if w.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    def validate_for_runtime(self) -> None:
        """Fail fast on unsafe or incomplete configuration."""
        if not self.use_mock_db and not self.mongodb_uri:
            raise RuntimeError("MONGODB_URI is not set. See backend/.env.example.")
        if self.storage_backend == "cloudinary" and not (
            self.cloudinary_cloud_name and self.cloudinary_api_key and self.cloudinary_api_secret
        ):
            raise RuntimeError("Cloudinary credentials are missing. See backend/.env.example.")
        if self.is_production:
            if self.secret_salt == DEFAULT_SALT or len(self.secret_salt) < 16:
                raise RuntimeError("SECRET_SALT must be a long random string in production.")
            if self.use_mock_db or self.storage_backend == "local":
                raise RuntimeError("Mock database and local storage are not allowed in production.")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
