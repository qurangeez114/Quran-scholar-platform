import os
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv
from models import Base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_URL = DATABASE_URL.replace(
    "postgresql://", "postgresql+asyncpg://"
)

engine = create_async_engine(DATABASE_URL, echo=True)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    import asyncio
    asyncio.run(init_db())
