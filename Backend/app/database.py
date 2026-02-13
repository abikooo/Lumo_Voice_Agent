from sqlmodel import SQLModel, create_engine, Session

# PostgreSQL Connection
DATABASE_URL = "postgresql://postgres:postgres123@localhost:5433/lumoai"

engine = create_engine(DATABASE_URL)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
