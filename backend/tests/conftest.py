import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.models.brand import Brand

# In-memory SQLite database with StaticPool for thread-safe test isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_database():
    """Create all tables before each test and drop them afterwards."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    """Yields a database session for direct test operations."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    """Test client with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_brand(db_session) -> Brand:
    """Creates and returns a sample brand for tests."""
    brand = Brand(
        name="Acme Corp",
        website="https://acme.example.com",
        logo_url="https://acme.example.com/logo.png",
        official_social_urls=["https://twitter.com/acmecorp", "https://linkedin.com/company/acmecorp"],
        official_apps=["com.acmecorp.app"],
        official_developers=["Acme Corporation"],
        aliases=["Acme", "Acme Global"],
    )
    db_session.add(brand)
    db_session.commit()
    db_session.refresh(brand)
    return brand
