from sqlalchemy import create_engine, text

# PostgreSQL Connection
DATABASE_URL = "postgresql://postgres:postgres123@localhost:5433/lumoai"

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        # Check if column exists
        result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='session' AND column_name='video_url';"))
        if result.fetchone():
            print("Column 'video_url' already exists.")
        else:
            print("Adding 'video_url' column...")
            connection.execute(text("ALTER TABLE session ADD COLUMN video_url TEXT;"))
            connection.commit()
            print("Column 'video_url' added successfully.")
except Exception as e:
    print(f"Error: {e}")
