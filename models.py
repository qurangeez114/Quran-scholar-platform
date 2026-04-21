from sqlalchemy import Column, Integer, Text, String, UniqueConstraint
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class QuranVerse(Base):
    __tablename__ = "quran_verses"

    id = Column(Integer, primary_key=True, index=True)
    surah_number = Column(Integer, nullable=False)
    ayah_number = Column(Integer, nullable=False)

    arabic = Column(Text, nullable=False)
    english = Column(Text)
    tigrinya = Column(Text)

    __table_args__ = (
        UniqueConstraint(
            "surah_number",
            "ayah_number",
            name="uq_surah_ayah"
        ),
    )
